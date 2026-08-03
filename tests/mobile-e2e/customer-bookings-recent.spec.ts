import { expect, test, type Page } from '@playwright/test';

const customerId = '99000000-0000-4000-8000-000000000011';
const authStorageKey = 'sb-qsurouiyvisykjkgjqmz-auth-token';

function accessToken() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: customerId,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3_600,
  })}.test-signature`;
}

async function useCustomerBookingsFixture(page: Page) {
  const token = accessToken();
  const user = {
    id: customerId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'recent.bookings@example.test',
    email_confirmed_at: '2026-07-30T00:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { role: 'USER' },
    created_at: '2026-07-30T00:00:00.000Z',
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
          id: customerId,
          email: user.email,
          status: 'ACTIVE',
          role: 'USER',
        },
        active_role: 'USER',
        profile: {
          display_name: 'Recent Bookings Customer',
          verification_status: 'verified',
        },
        email_verified: true,
        profile_complete: true,
      }),
    }),
  );
  await page.route('**/rest/v1/bookings*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        Array.from({ length: 7 }, (_, index) => ({
          id: `99000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
          service_request_id: `99100000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
          worker_account_id: '99200000-0000-4000-8000-000000000001',
          status: 'COMPLETED',
          created_at: new Date(Date.UTC(2026, 6, 30 - index)).toISOString(),
          agreed_service_amount: 500 + index * 100,
          service_requests: {
            description: `Completed service ${index + 1}`,
            scheduled_at: new Date(Date.UTC(2026, 6, 30 - index, 10)).toISOString(),
            addresses: {
              line1: 'Test Street',
              barangay: 'Test Barangay',
              city: 'Test City',
            },
            service_categories: { name: `Recent Service ${index + 1}` },
          },
          worker_profiles: {
            display_name: 'Rate Worker',
            avatar_path: null,
            reviews: [],
          },
        })),
      ),
    }),
  );
}

test('customer bookings show five recent items before See All', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useCustomerBookingsFixture(page);

  await page.goto('/bookings?filter=Completed');

  await expect(page.getByTestId('customer-booking-card')).toHaveCount(5);
  await expect(page.getByText('Recent Service 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Recent Service 6', { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'See All' }).click();

  await expect(page.getByTestId('customer-booking-card')).toHaveCount(7);
  await expect(page.getByText('Recent Service 7', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'See All' })).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(1);
});
