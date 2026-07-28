import { expect, test } from '@playwright/test';

const customerId = 'b1000000-0000-0000-0000-000000000001';
const workerId = 'b2000000-0000-0000-0000-000000000001';
const conversationId = 'b3000000-0000-0000-0000-000000000001';
const bookingId = 'b4000000-0000-0000-0000-000000000001';
const requestId = 'b5000000-0000-0000-0000-000000000001';

test.beforeEach(async ({ page }) => {
  const session = {
    access_token: 'matched-messaging-test-token',
    refresh_token: 'matched-messaging-test-refresh',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: customerId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'matched-customer@example.test',
      app_metadata: {},
      user_metadata: { role: 'USER' },
      created_at: new Date().toISOString(),
    },
  };

  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    {
      key: 'sb-qsurouiyvisykjkgjqmz-auth-token',
      value: session,
    },
  );
  await page.route('**/auth/v1/user', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    }),
  );
  await page.route('**/rest/v1/rpc/get_my_profile', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        account: {
          id: customerId,
          email: session.user.email,
          mobile: '+639171234567',
          role: 'USER',
          status: 'ACTIVE',
        },
        profile: {
          display_name: 'Matched Customer',
          preferred_locale: 'en',
        },
        active_role: 'USER',
        email_verified: true,
        profile_complete: true,
      }),
    }),
  );
  await page.route('**/rest/v1/rpc/mark_conversation_read', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(null),
    }),
  );
  await page.route('**/rest/v1/conversations?*', (route) => {
    const url = new URL(route.request().url());
    const detail = url.searchParams.has('id');
    const row = {
      id: conversationId,
      booking_id: bookingId,
      service_request_id: requestId,
      worker_account_id: workerId,
      archived_at: null,
      updated_at: '2026-07-28T08:00:00.000Z',
      bookings: {
        status: 'COMPLETED',
        user_account_id: customerId,
        worker_account_id: workerId,
      },
      service_requests: {
        status: 'CLOSED',
        user_account_id: customerId,
        selected_worker_id: workerId,
      },
      conversation_participants: [
        {
          account_id: customerId,
          last_read_at: '2026-07-28T08:00:00.000Z',
          user_profiles: {
            display_name: 'Matched Customer',
            avatar_path: '',
          },
          worker_profiles: null,
        },
        {
          account_id: workerId,
          last_read_at: null,
          user_profiles: null,
          worker_profiles: {
            display_name: 'Matched Worker',
            avatar_path: '',
          },
        },
      ],
      messages: [
        {
          id: 'b6000000-0000-0000-0000-000000000001',
          body: 'The completed job message is retained.',
          created_at: '2026-07-28T08:00:00.000Z',
          sender_id: workerId,
        },
      ],
    };
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: detail ? {} : { 'content-range': '0-0/1' },
      body: JSON.stringify(detail ? row : [row]),
    });
  });
  await page.route('**/rest/v1/messages?*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'b6000000-0000-0000-0000-000000000001',
          conversation_id: conversationId,
          sender_id: workerId,
          body: 'The completed job message is retained.',
          original_locale: 'en',
          created_at: '2026-07-28T08:00:00.000Z',
          message_translations: [],
        },
      ]),
    }),
  );
});

test('only matched conversations are listed and closed chat is read-only', async ({
  page,
}) => {
  await page.goto('/messages');

  await expect(page.getByText('Matched Conversations')).toBeVisible();
  await expect(page.getByText('Matched Worker')).toBeVisible();
  await expect(page.getByText('Read only')).toBeVisible();
  await expect(page.getByText('PoC Demo', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Tap to Chat', { exact: false })).toHaveCount(0);

  await page.goto(`/messages/chat?conversationId=${conversationId}`);

  await expect(page.getByText('Read-only history')).toBeVisible();
  await expect(
    page.getByText('This conversation is read-only because the job is closed.'),
  ).toBeVisible();
  await expect(page.getByText('Hire Again')).toBeVisible();
  await expect(page.getByText('Delete Conversation')).toBeVisible();
  await expect(
    page.getByPlaceholder('Conversation is read-only'),
  ).toHaveAttribute('readonly', '');
});
