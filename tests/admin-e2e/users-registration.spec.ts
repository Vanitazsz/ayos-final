import { expect, test, type Page } from '@playwright/test';

const projectRef = 'qsurouiyvisykjkgjqmz';
const authStorageKey = `sb-${projectRef}-auth-token`;
const adminId = '58cbe239-f868-4b4c-8bc3-1b281b01da08';
const customerId = '44444444-4444-4444-8444-444444444444';

function accessToken() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: adminId,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3_600,
  })}.test-signature`;
}

async function useAdminFixture(page: Page) {
  const token = accessToken();
  const user = {
    id: adminId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@local.com',
    email_confirmed_at: '2026-07-22T00:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'], ayos_role: 'ADMIN' },
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
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }),
  );
  await page.route('**/rest/v1/rpc/is_admin', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: 'true' }),
  );
  await page.route('**/rest/v1/rpc/get_my_profile', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        account: {
          id: adminId,
          email: user.email,
          status: 'ACTIVE',
          role: 'ADMIN',
        },
        active_role: 'ADMIN',
        profile: { display_name: 'A-YOS Administrator' },
        profile_complete: true,
      }),
    }),
  );
  await page.route('**/rest/v1/accounts*', (route) => {
    const select = new URL(route.request().url()).searchParams.get('select') ?? '';
    if (!select.includes('bookings!bookings_user_account_id_fkey(count)')) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'PGRST200',
          message: 'Invalid accounts-to-bookings relationship',
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: customerId,
          email: 'new.customer@example.test',
          mobile: null,
          status: 'ACTIVE',
          created_at: '2026-07-22T06:00:00.000Z',
          user_profiles: {
            display_name: 'New Customer',
            verification_status: 'unverified',
            bookings: [{ count: 0 }],
          },
          addresses: [],
        },
      ]),
    });
  });
  await page.route('**/rest/v1/customer_verifications*', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'PGRST205',
        message: "Could not find the table 'public.customer_verifications'",
      }),
    }),
  );
}

test('new customers remain visible when the verification queue is unavailable', async ({
  page,
}) => {
  await useAdminFixture(page);
  await page.goto('/admin/users');

  await expect(page.getByRole('heading', { name: 'Users Management' })).toBeVisible();
  await expect(page.getByText('New Customer', { exact: true })).toBeVisible();
  await expect(page.getByText('new.customer@example.test', { exact: true })).toBeVisible();
  await expect(page.getByText('Showing 1 of 1 users', { exact: true })).toBeVisible();
});
