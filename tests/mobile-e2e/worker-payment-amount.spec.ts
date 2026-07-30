import { expect, test, type Page } from '@playwright/test';

const workerId = '98000000-0000-4000-8000-000000000011';
const bookingId = '98000000-0000-4000-8000-000000000012';
const authStorageKey = 'sb-qsurouiyvisykjkgjqmz-auth-token';

function accessToken() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: workerId,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3_600,
  })}.test-signature`;
}

async function useCompletedBookingFixture(page: Page, paymentStatus = 'SUCCESSFUL') {
  const token = accessToken();
  const user = {
    id: workerId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'payment.worker@example.test',
    email_confirmed_at: '2026-07-29T00:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { role: 'WORKER' },
    created_at: '2026-07-29T00:00:00.000Z',
  };

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
          id: workerId,
          email: user.email,
          mobile: '+639171234567',
          status: 'ACTIVE',
          role: 'WORKER',
        },
        active_role: 'WORKER',
        profile: { display_name: 'Payment Worker' },
        email_verified: true,
        profile_complete: true,
      }),
    }),
  );
  await page.route('**/rest/v1/rpc/get_my_worker_matching_readiness', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        matchable: false,
        setupComplete: false,
      }),
    }),
  );
  await page.route('**/rest/v1/bookings*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: bookingId,
        status: 'COMPLETED',
        accepted_at: '2026-07-29T10:00:00.000Z',
        completed_at: '2026-07-29T11:00:00.000Z',
        agreed_service_amount: 5_000,
        worker_start_lat: null,
        worker_start_lng: null,
        service_requests: {
          id: '98000000-0000-4000-8000-000000000013',
          description: 'Repair the air conditioner',
          scheduled_at: '2026-07-29T10:00:00.000Z',
          service_categories: { name: 'Aircon Repair' },
          addresses: {
            line1: 'Sapphire Avenue',
            barangay: 'Inocencio',
            city: 'Trece Martires City',
            latitude: 14.282,
            longitude: 120.867,
          },
        },
        user_profiles: {
          display_name: 'Jhon Fiel',
          avatar_path: null,
        },
        payments: [
          {
            status: paymentStatus,
            service_amount: 500,
          },
        ],
        booking_status_events: [],
        cancellations: [],
      }),
    }),
  );
}

test('worker earnings match the customer confirmed payment', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useCompletedBookingFixture(page);

  await page.goto(`/booking-request/${bookingId}`);

  await expect(page.getByText('Est. Earnings', { exact: true })).toBeVisible();
  await expect(page.getByText('₱500', { exact: true })).toHaveCount(2);
  await expect(page.getByText('₱5,000', { exact: true })).toHaveCount(0);
  await expect(
    page.getByText('Cash payment has been confirmed by both parties.', {
      exact: true,
    }),
  ).toBeVisible();
});

test('worker earnings use the payment amount while cash confirmation is pending', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useCompletedBookingFixture(page, 'AWAITING_CONFIRMATIONS');

  await page.goto(`/booking-request/${bookingId}`);

  await expect(page.getByText('₱500', { exact: true })).toHaveCount(2);
  await expect(page.getByText('₱5,000', { exact: true })).toHaveCount(0);
  await expect(
    page.getByText('Confirm only after you have received the cash payment.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm Cash Received' })).toBeVisible();
});
