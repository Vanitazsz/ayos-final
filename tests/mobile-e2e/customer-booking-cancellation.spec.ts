import { expect, test, type Page } from '@playwright/test';

const customerId = '99000000-0000-4000-8000-000000000011';
const bookingId = '99000000-0000-4000-8000-000000000001';
const authStorageKey = 'sb-qsurouiyvisykjkgjqmz-auth-token';

function accessToken() {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: customerId,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3_600,
  })}.test-signature`;
}

function bookingRow(status: 'PENDING' | 'CANCELLED', reason?: string) {
  return {
    id: bookingId,
    service_request_id: '99100000-0000-4000-8000-000000000001',
    worker_account_id: '99200000-0000-4000-8000-000000000001',
    user_account_id: customerId,
    status,
    created_at: '2026-08-14T10:00:00.000Z',
    agreed_service_amount: 500,
    service_requests: {
      description: 'Leaking kitchen faucet',
      scheduled_at: '2026-08-15T10:00:00.000Z',
      addresses: {
        line1: 'Test Street',
        barangay: 'Test Barangay',
        city: 'Test City',
      },
      service_categories: { name: 'Plumbing' },
    },
    worker_profiles: {
      display_name: 'Test Worker',
      avatar_path: null,
      accounts: { mobile: '+639171234567' },
    },
    user_profiles: { display_name: 'Test Homeowner', avatar_path: null },
    booking_status_events: [],
    cancellations: reason ? [{ reason, refund_amount: 0 }] : [],
    payments: [],
  };
}

async function useHomeownerCancellationFixture(page: Page) {
  const token = accessToken();
  const user = {
    id: customerId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'cancellation.homeowner@example.test',
    email_confirmed_at: '2026-08-14T00:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { role: 'USER' },
    created_at: '2026-08-14T00:00:00.000Z',
  };
  let bookingStatus: 'PENDING' | 'CANCELLED' = 'PENDING';
  let resolveRpcRequest: ((payload: Record<string, unknown>) => void) | null =
    null;
  const rpcRequest = new Promise<Record<string, unknown>>((resolve) => {
    resolveRpcRequest = resolve;
  });

  await page.addInitScript(
    ({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
    {
      key: authStorageKey,
      session: {
        access_token: token,
        refresh_token: 'test-refresh-token',
        token_type: 'bearer',
        expires_in: 3_600,
        expires_at: Math.floor(Date.now() / 1000) + 3_600,
        user,
      },
    },
  );

  await page.route('**/auth/v1/user', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    }),
  );
  await page.route('**/rest/v1/rpc/get_my_profile', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        account: {
          id: customerId,
          email: user.email,
          status: 'ACTIVE',
          role: 'USER',
        },
        active_role: 'USER',
        profile: {
          display_name: 'Test Homeowner',
          verification_status: 'verified',
        },
        email_verified: true,
        profile_complete: true,
      }),
    }),
  );
  await page.route('**/rest/v1/bookings*', (route) => {
    const url = new URL(route.request().url());
    const row = bookingRow(
      bookingStatus,
      bookingStatus === 'CANCELLED' ? 'Schedule changed' : undefined,
    );
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        url.searchParams.get('id') === `eq.${bookingId}` ? row : [row],
      ),
    });
  });
  await page.route('**/rest/v1/rpc/get_booking_tracking', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    }),
  );
  await page.route('**/rest/v1/cancellation_reasons*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          code: 'SCHEDULE_CHANGED',
          label: 'Schedule changed',
          applies_to: 'USER',
          sort_order: 10,
          is_active: true,
        },
        {
          code: 'OTHER',
          label: 'Other',
          applies_to: 'BOTH',
          sort_order: 100,
          is_active: true,
        },
        {
          code: 'WORKER_UNAVAILABLE',
          label: 'Worker unavailable',
          applies_to: 'WORKER',
          sort_order: 20,
          is_active: true,
        },
      ]),
    }),
  );
  await page.route('**/rest/v1/content_pages*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        key: 'REFUND_POLICY',
        title: 'Refund Policy',
        body: 'Refund eligibility depends on the booking stage and the reason for cancellation. The cancellation policy displayed at the time of the request applies. Disputes are handled through A-YOS support.',
        version: '2026-07-23',
        updated_at: '2026-07-23T00:00:00.000Z',
      }),
    }),
  );
  await page.route('**/rest/v1/rpc/cancel_booking', async (route) => {
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    resolveRpcRequest?.(payload);
    bookingStatus = 'CANCELLED';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(bookingRow('CANCELLED', 'Schedule changed')),
    });
  });

  return { rpcRequest };
}

test('homeowner can cancel a booking after reviewing the refund policy', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const cancellation = await useHomeownerCancellationFixture(page);

  await page.goto(`/tracking/${bookingId}`);
  await expect(
    page.getByRole('button', { name: 'Cancel Booking' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel Booking' }).click();

  await expect(page).toHaveURL(new RegExp(`/cancel-booking/${bookingId}$`));
  await expect(
    page.getByText('Why are you cancelling this booking?'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Schedule changed' }).click();
  await expect(page.getByText('Selected')).toBeVisible();
  await expect(page.getByText('Refund Policy')).toBeVisible();
  await expect(
    page.getByText(
      'Refund eligibility depends on the booking stage and the reason for cancellation.',
    ),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Confirm Cancellation' }).click();
  await expect(cancellation.rpcRequest).resolves.toMatchObject({
    p_booking_id: bookingId,
    p_reason_code: 'SCHEDULE_CHANGED',
    p_details: 'Schedule changed',
    p_policy_version: '2026-07-23',
  });
  await expect(page.getByText('Cancellation Confirmed')).toBeVisible();
  await page.getByRole('button', { name: 'View Cancelled Bookings' }).click();

  await expect(page).toHaveURL(/\/bookings\?filter=Cancelled$/);
  await expect(
    page.getByRole('button', { name: 'Cancelled' }),
  ).toBeVisible();
  await expect(page.getByText('Reason: Schedule changed')).toBeVisible();
});
