import { adminClient } from '../_shared/auth.ts';
import { parseExpoPushTickets } from '../_shared/expo-push.ts';
import { json, options } from '../_shared/http.ts';

interface QueueMessage {
  msg_id: number;
  read_ct: number;
  message: Record<string, unknown>;
}
function assertSuccess(error: { message: string } | null, operation: string): void {
  if (error) throw new Error(`${operation}: ${error.message}`);
}
const queues = [
  'booking_timeouts',
  'no_match_notifications',
  'scheduled_notifications',
  'provider_work',
  'push_notifications',
] as const;

async function sendPushNotification(
  admin: ReturnType<typeof adminClient>,
  notificationId: unknown,
  recipientId: unknown,
): Promise<void> {
  if (typeof notificationId !== 'string' || typeof recipientId !== 'string')
    throw new Error('INVALID_PUSH_JOB');
  const [
    { data: notification, error: notificationError },
    { data: subscriptions, error: subscriptionsError },
  ] = await Promise.all([
    admin.from('notifications').select('id,title,body,category').eq('id', notificationId).single(),
    admin
      .from('push_subscriptions')
      .select('id,expo_push_token')
      .eq('account_id', recipientId)
      .eq('enabled', true)
      .is('invalidated_at', null),
  ]);
  assertSuccess(notificationError, 'push notification lookup');
  assertSuccess(subscriptionsError, 'push subscription lookup');
  if (!notification || !subscriptions?.length) return;

  for (let offset = 0; offset < subscriptions.length; offset += 100) {
    const batch = subscriptions.slice(offset, offset + 100);
    const headers: Record<string, string> = {
      accept: 'application/json',
      'content-type': 'application/json',
    };
    const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      headers,
      body: JSON.stringify(
        batch.map((subscription) => ({
          to: subscription.expo_push_token,
          title: notification.title,
          body: notification.body,
          sound: 'default',
          data: { notificationId: notification.id, category: notification.category },
        })),
      ),
    });
    if (!response.ok) throw new Error(`EXPO_PUSH_HTTP_${response.status}`);
    const results = parseExpoPushTickets(await response.json(), batch.length);
    for (let index = 0; index < batch.length; index += 1) {
      const subscription = batch[index];
      const result = results[index];
      const attempt = await admin.from('push_delivery_attempts').upsert(
        {
          notification_id: notification.id,
          subscription_id: subscription.id,
          status: result.status,
          provider_reference: result.providerReference ?? null,
          failure_reason: result.failureReason ?? null,
          attempted_at: new Date().toISOString(),
        },
        { onConflict: 'notification_id,subscription_id' },
      );
      assertSuccess(attempt.error, 'push attempt');
      if (result.status === 'INVALID_TOKEN') {
        const retired = await admin
          .from('push_subscriptions')
          .update({ enabled: false, invalidated_at: new Date().toISOString() })
          .eq('id', subscription.id);
        assertSuccess(retired.error, 'invalid push token retirement');
      }
    }
  }
}

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.headers.get('x-ayos-queue-secret') !== Deno.env.get('EDGE_FUNCTION_SHARED_SECRET'))
    return json({ error: { code: 'FORBIDDEN', message: 'Invalid queue invocation.' } }, 403);
  const admin = adminClient();
  let processed = 0;
  let failed = 0;
  for (const queue of queues) {
    const { data, error } = await admin.rpc('read_job_batch', {
      queue_name: queue,
      visibility_seconds: 60,
      batch_size: 20,
    });
    if (error) {
      failed += 1;
      continue;
    }
    for (const raw of (data ?? []) as QueueMessage[]) {
      try {
        if (queue === 'booking_timeouts') {
          const result = await admin.rpc('expire_booking_request', {
            target_booking: raw.message.booking_id,
          });
          assertSuccess(result.error, 'booking timeout');
        } else if (queue === 'no_match_notifications' && raw.message.user_account_id) {
          const result = await admin.from('notifications').upsert(
            {
              recipient_id: raw.message.user_account_id,
              title: 'No workers available yet',
              body: 'Adjust the schedule or budget, or keep notifications enabled while A-YOS looks for a match.',
              category: 'MATCHING',
              status: 'SENT',
              sent_at: new Date().toISOString(),
              source_key: `no-match:${String(raw.message.service_request_id)}`,
            },
            { onConflict: 'source_key', ignoreDuplicates: true },
          );
          assertSuccess(result.error, 'no-match notification');
        } else if (queue === 'scheduled_notifications' && raw.message.notification_id) {
          const result = await admin
            .from('notifications')
            .update({ status: 'SENT', sent_at: new Date().toISOString() })
            .eq('id', raw.message.notification_id);
          assertSuccess(result.error, 'scheduled notification');
        } else if (queue === 'push_notifications') {
          await sendPushNotification(admin, raw.message.notification_id, raw.message.recipient_id);
        } else if (queue === 'provider_work') throw new Error('PROVIDER_UNAVAILABLE');
        const archived = await admin.rpc('archive_job', {
          queue_name: queue,
          message_id: raw.msg_id,
        });
        assertSuccess(archived.error, 'queue archive');
        processed += 1;
      } catch (error) {
        failed += 1;
        if (raw.read_ct >= 5) {
          const failure = await admin.from('job_failures').upsert(
            {
              queue_name: queue,
              message_id: raw.msg_id,
              payload: raw.message,
              attempts: raw.read_ct,
              error: error instanceof Error ? error.message : 'Unknown queue error',
            },
            { onConflict: 'queue_name,message_id' },
          );
          assertSuccess(failure.error, 'failure record');
          const archived = await admin.rpc('archive_job', {
            queue_name: queue,
            message_id: raw.msg_id,
          });
          assertSuccess(archived.error, 'failed queue archive');
        }
      }
    }
  }
  return json({ processed, failed });
});
