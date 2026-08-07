import { adminClient } from '../_shared/auth.ts';
import { json, options } from '../_shared/http.ts';

interface ExpiredProof {
  id: string;
  storage_path: string;
  byte_size: number;
}

const BATCH_SIZE = 100;

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.headers.get('x-ayos-queue-secret') !== Deno.env.get('EDGE_FUNCTION_SHARED_SECRET'))
    return json({ error: { code: 'FORBIDDEN', message: 'Invalid retention invocation.' } }, 403);

  const admin = adminClient();
  const cancelledDays = Number(Deno.env.get('PROOF_RETENTION_CANCELLED_DAYS') ?? 7);
  const completedDays = Number(Deno.env.get('PROOF_RETENTION_COMPLETED_DAYS') ?? 30);

  const { data, error } = await admin.rpc('list_expired_booking_proofs', {
    p_cancelled_days: cancelledDays,
    p_completed_days: completedDays,
  });
  if (error) throw new Error(`list_expired_booking_proofs: ${error.message}`);
  const proofs = (data ?? []) as ExpiredProof[];

  let removed = 0;
  let failed = 0;
  let deletedBytes = 0;

  for (let offset = 0; offset < proofs.length; offset += BATCH_SIZE) {
    const batch = proofs.slice(offset, offset + BATCH_SIZE);
    const { error: removeError } = await admin.storage
      .from('booking-proof')
      .remove(batch.map((proof) => proof.storage_path));
    if (removeError) {
      failed += batch.length;
      continue;
    }
    const { error: deleteError } = await admin
      .from('booking_proof_media')
      .delete()
      .in(
        'id',
        batch.map((proof) => proof.id),
      );
    if (deleteError) {
      failed += batch.length;
      continue;
    }
    removed += batch.length;
    deletedBytes += batch.reduce((sum, proof) => sum + (proof.byte_size ?? 0), 0);
  }

  if (removed > 0) {
    await admin.from('audit_logs').insert({
      actor_id: null,
      action: 'BOOKING_PROOF_RETENTION',
      entity_type: 'booking_proof_media',
      entity_id: null,
      metadata: {
        removed,
        failed,
        deletedBytes,
        cancelledDays,
        completedDays,
      },
    });
  }

  return json({ removed, failed, deletedBytes });
});
