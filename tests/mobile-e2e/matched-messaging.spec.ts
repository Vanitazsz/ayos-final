import { expect, test } from '@playwright/test';

const customerId = 'b1000000-0000-0000-0000-000000000001';
const workerId = 'b2000000-0000-0000-0000-000000000001';
const conversationId = 'b3000000-0000-0000-0000-000000000001';
const bookingId = 'b4000000-0000-0000-0000-000000000001';
const requestId = 'b5000000-0000-0000-0000-000000000001';
let bookingStatus = 'COMPLETED';
let requestStatus = 'CLOSED';
let messageRows: Record<string, unknown>[] = [];
let conversationFetchFails = false;
let conversationArchived = false;
let archiveRequests = 0;
let conversationDeleted = false;
let deleteRequests = 0;

test.beforeEach(async ({ page }, testInfo) => {
  const workerSession = testInfo.title.toLowerCase().includes('worker');
  const currentUserId = workerSession ? workerId : customerId;
  const otherUserId = workerSession ? customerId : workerId;
  bookingStatus = 'COMPLETED';
  requestStatus = 'CLOSED';
  conversationFetchFails = false;
  conversationArchived = false;
  archiveRequests = 0;
  conversationDeleted = false;
  deleteRequests = 0;
  messageRows = [
    {
      id: 'b6000000-0000-0000-0000-000000000001',
      conversation_id: conversationId,
      sender_id: otherUserId,
      body: 'The completed job message is retained.',
      original_locale: 'en',
      created_at: '2026-07-28T08:00:00.000Z',
      message_translations: [
        { target_locale: 'fil', translated: 'Isinaling mensahe' },
      ],
    },
  ];
  const session = {
    access_token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiMjAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6NDA3MDkwODgwMH0.test-signature',
    refresh_token: 'matched-messaging-test-refresh',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: currentUserId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'matched-customer@example.test',
      app_metadata: {},
      user_metadata: { role: workerSession ? 'WORKER' : 'USER' },
      created_at: new Date().toISOString(),
    },
  };

  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: 'sb-qsurouiyvisykjkgjqmz-auth-token',
    value: session,
  });
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
          id: currentUserId,
          email: session.user.email,
          mobile: '+639171234567',
          role: workerSession ? 'WORKER' : 'USER',
          status: 'ACTIVE',
        },
        profile: {
          display_name: 'Matched Customer',
          preferred_locale: 'fil',
          approval_status: workerSession ? 'APPROVED' : undefined,
        },
        active_role: workerSession ? 'WORKER' : 'USER',
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
  await page.route('**/rest/v1/rpc/get_my_worker_matching_readiness', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        matchable: false,
        setupComplete: false,
        online: false,
      }),
    }),
  );
  await page.route('**/rest/v1/conversations?*', (route) => {
    const url = new URL(route.request().url());
    const detail = url.searchParams.has('id');
    if (!url.searchParams.has('booking_id')) {
      expect(url.searchParams.get('select')).toContain('worker_profiles:worker_account_id');
      expect(url.searchParams.get('select')).toContain('user_profiles:user_account_id');
    }
    if (conversationFetchFails) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: '42703',
          message: 'Conversation profile query failed',
        }),
      });
    }
    const row = {
      id: conversationId,
      booking_id: bookingId,
      service_request_id: requestId,
      worker_account_id: workerId,
      archived_at: null,
      updated_at: '2026-07-28T08:00:00.000Z',
      worker_profiles: {
        display_name: 'Matched Worker',
        avatar_path: '',
      },
      bookings: {
        status: bookingStatus,
        user_account_id: customerId,
        worker_account_id: workerId,
        user_profiles: {
          display_name: 'Matched Customer',
          avatar_path: '',
        },
        worker_profiles: {
          display_name: 'Matched Worker',
          avatar_path: '',
        },
      },
      service_requests: {
        status: requestStatus,
        user_account_id: customerId,
        selected_worker_id: workerId,
        user_profiles: {
          display_name: 'Matched Customer',
          avatar_path: '',
        },
        worker_profiles: {
          display_name: 'Matched Worker',
          avatar_path: '',
        },
      },
      conversation_participants: [
        {
          account_id: customerId,
          last_read_at: '2026-07-28T08:00:00.000Z',
          accounts: null,
        },
        {
          account_id: workerId,
          last_read_at: null,
          accounts: null,
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
    const responseBody = detail ? row : conversationArchived || conversationDeleted ? [] : [row];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: detail
        ? {}
        : {
            'content-range': conversationArchived || conversationDeleted ? '*/0' : '0-0/1',
          },
      body: JSON.stringify(responseBody),
    });
  });
  await page.route('**/rest/v1/messages?*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(messageRows),
    }),
  );
  await page.route('**/rest/v1/rpc/send_chat_message', async (route) => {
    const request = route.request().postDataJSON();
    const sent = {
      id: 'b6000000-0000-0000-0000-000000000002',
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: request.p_body,
      original_locale: 'en',
      created_at: '2026-07-28T08:01:00.000Z',
    };
    messageRows.push(sent);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sent),
    });
  });
  await page.route('**/rest/v1/rpc/archive_closed_conversation', async (route) => {
    const request = route.request().postDataJSON();
    expect(request.p_conversation_id).toBe(conversationId);
    archiveRequests += 1;
    conversationArchived = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: conversationId,
        archived_at: new Date().toISOString(),
      }),
    });
  });
  await page.route('**/rest/v1/rpc/delete_closed_conversation', async (route) => {
    const request = route.request().postDataJSON();
    expect(request.p_conversation_id).toBe(conversationId);
    deleteRequests += 1;
    conversationDeleted = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: conversationId,
        archived_at: null,
      }),
    });
  });
});

test('only matched conversations are listed and closed chat is read-only', async ({ page }) => {
  await page.goto('/messages');

  await expect(page.getByText('Matched Worker')).toBeVisible();
  await expect(page.getByText('Chat Participant')).toHaveCount(0);
  await expect(page.getByText('PoC Demo', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Tap to Chat', { exact: false })).toHaveCount(0);

  await page.goto(`/messages/chat?conversationId=${conversationId}`);

  await expect(
    page.getByText('The completed job message is retained.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Isinaling mensahe', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Show original', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Read-only history')).toBeVisible();
  await expect(
    page.getByText('This conversation is read-only because the job is closed.'),
  ).toBeVisible();
  await expect(page.getByText('Hire Again')).toBeVisible();
  await expect(page.getByText('Delete Conversation')).toHaveCount(0);
  await expect(page.getByPlaceholder('Conversation is read-only')).toHaveAttribute('readonly', '');
});

test('closed conversation can be permanently deleted from the swipe actions', async ({ page }) => {
  await page.goto('/messages');

  await expect(page.getByText('Matched Worker')).toBeVisible();

  const deleteAction = page.getByRole('button', {
    name: 'Delete conversation with Matched Worker',
  });
  await expect(deleteAction).toBeVisible();
  await deleteAction.evaluate((element) => (element as HTMLElement).click());

  await expect(page.getByText('Delete Conversation')).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(page.getByText('No Messages Yet')).toBeVisible();
  expect(deleteRequests).toBe(1);
  expect(archiveRequests).toBe(0);
});

test('active matched conversation accepts and displays a sent message', async ({ page }) => {
  bookingStatus = 'ACCEPTED';
  requestStatus = 'MATCHED';

  await page.goto(`/messages/chat?conversationId=${conversationId}`);

  await expect(page.getByText('Matched conversation')).toBeVisible();
  const composer = page.getByPlaceholder('Type a message...');
  await expect(composer).toBeEditable();
  await composer.fill('Hello worker');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Hello worker')).toBeVisible();
  await expect(page.getByText('Request failed')).toHaveCount(0);
});

test('active matched worker conversation loads the customer and sends', async ({ page }) => {
  bookingStatus = 'ACCEPTED';
  requestStatus = 'MATCHED';

  await page.goto(`/messages/chat?conversationId=${conversationId}`);

  await expect(page.getByText('Matched Customer')).toBeVisible();
  await expect(page.getByText('Matched conversation')).toBeVisible();
  const composer = page.getByPlaceholder('Type a message...');
  await composer.fill('Hello customer');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Hello customer')).toBeVisible();
});

test('fetch failure shows retry instead of read-only history', async ({ page }) => {
  bookingStatus = 'ACCEPTED';
  requestStatus = 'MATCHED';
  conversationFetchFails = true;

  await page.goto(`/messages/chat?conversationId=${conversationId}`);

  await expect(page.getByText('Unable to load conversation')).toBeVisible();
  await expect(page.getByText('Conversation profile query failed')).toBeVisible();
  await expect(page.getByText('Read-only history')).toHaveCount(0);
  await expect(page.getByPlaceholder('Conversation unavailable')).toHaveAttribute('readonly', '');

  conversationFetchFails = false;
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('Matched conversation')).toBeVisible();
  await expect(page.getByPlaceholder('Type a message...')).toBeEditable();
});

test('worker conversation list fetch failure shows retry', async ({ page }) => {
  conversationFetchFails = true;

  await page.goto('/messages');
  await page.getByRole('tab', { name: 'Messages' }).click();

  await expect(page.getByText('Conversation profile query failed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(page.getByText('No Matched Conversations')).toHaveCount(0);

  conversationFetchFails = false;
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('Matched Customer')).toBeVisible();
  await expect(page.getByText('Chat Participant')).toHaveCount(0);
});

test('customer conversation list fetch failure shows retry', async ({ page }) => {
  conversationFetchFails = true;

  await page.goto('/messages');

  await expect(page.getByText('Conversation profile query failed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(page.getByText('No Matched Conversations')).toHaveCount(0);

  conversationFetchFails = false;
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('Matched Worker')).toBeVisible();
  await expect(page.getByText('Chat Participant')).toHaveCount(0);
});
