import { expect, test, type Page } from '@playwright/test';

const accountId = '11111111-1111-4111-8111-111111111111';
const authStorageKey = 'sb-qsurouiyvisykjkgjqmz-auth-token';
const services = [
  'Aircon Cleaning & Maintenance',
  'Aircon Installation',
  'Aircon Repair',
  'Cleaning',
  'Deep Cleaning',
].map((name, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  name,
  slug: name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, ''),
  minimum_price_minor: 10_000,
  maximum_price_minor: 50_000,
  is_safety_critical: false,
}));

function accessToken() {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: accountId,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3_600,
  })}.test-signature`;
}

async function useIncompleteCustomerFixture(page: Page) {
  const token = accessToken();
  const user = {
    id: accountId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'incomplete.customer@example.test',
    email_confirmed_at: '2026-07-22T00:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-07-22T00:00:00.000Z',
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
          id: accountId,
          email: user.email,
          mobile: null,
          status: 'ACTIVE',
          role: 'USER',
          password_changed_at: null,
        },
        active_role: 'USER',
        profile: {
          display_name: 'New Customer',
          avatar_path: null,
          verification_status: 'pending',
          subdivision_id: null,
        },
        default_address: null,
        email_verified: true,
        profile_complete: false,
      }),
    }),
  );
  await page.route('**/rest/v1/service_categories*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(services),
    }),
  );
  await page.route('**/rest/v1/worker_profiles*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/rest/v1/bookings*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/rest/v1/addresses*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/rest/v1/notifications*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
}

test('incomplete-profile customer sees a verification popup instead of opening notifications', async ({
  page,
}) => {
  await useIncompleteCustomerFixture(page);
  await page.goto('/home');

  await expect(page.getByLabel('Notifications')).toBeVisible();

  await page.getByLabel('Notifications').click();

  await expect(page.getByText('Verification In Progress')).toBeVisible();
  await expect(
    page.getByText('Your account is still being verified. Please wait until verification is complete.'),
  ).toBeVisible();

  await expect(page).toHaveURL(/\/home$/);
});

test('complete-profile customer opens the notifications page from the bell', async ({
  page,
}) => {
  await useIncompleteCustomerFixture(page);
  await page.route('**/rest/v1/rpc/get_my_profile', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        account: {
          id: accountId,
          email: 'incomplete.customer@example.test',
          mobile: null,
          status: 'ACTIVE',
          role: 'USER',
          password_changed_at: null,
        },
        active_role: 'USER',
        profile: {
          display_name: 'New Customer',
          avatar_path: null,
          verification_status: 'verified',
          subdivision_id: null,
        },
        default_address: null,
        email_verified: true,
        profile_complete: true,
      }),
    }),
  );

  await page.goto('/home');
  await expect(page.getByLabel('Notifications')).toBeVisible();

  await page.getByLabel('Notifications').click();

  await expect(page.getByText('Notifications', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/notifications$/);
});
