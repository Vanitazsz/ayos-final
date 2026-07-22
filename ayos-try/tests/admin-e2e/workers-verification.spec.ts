import { expect, test, type Page } from '@playwright/test';

const projectRef = 'qsurouiyvisykjkgjqmz';
const authStorageKey = `sb-${projectRef}-auth-token`;
const adminId = '58cbe239-f868-4b4c-8bc3-1b281b01da08';
const workerId = '55555555-5555-4555-8555-555555555555';
const verificationId = '66666666-6666-4666-8666-666666666666';

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
        account: { id: adminId, email: user.email, status: 'ACTIVE', role: 'ADMIN' },
        active_role: 'ADMIN',
        profile: { display_name: 'A-YOS Administrator' },
        profile_complete: true,
      }),
    }),
  );
  await page.route('**/rest/v1/worker_profiles*', (route) => {
    const select = new URL(route.request().url()).searchParams.get('select') ?? '';
    const validRelationships = [
      'accounts!worker_profiles_account_id_fkey',
      'worker_verifications!worker_verifications_worker_id_fkey',
      'bookings!bookings_worker_account_id_fkey',
      'reviews!reviews_worker_account_id_fkey',
    ].every((relationship) => select.includes(relationship));
    if (!validRelationships || select.includes('wallet_accounts(wallet_transactions')) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'PGRST201', message: 'Ambiguous worker relationship' }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          account_id: workerId,
          display_name: 'Pending Worker',
          bio: 'Cleaning professional',
          experience: 'Cleaning',
          service_area: 'Trece Martires City',
          approval_status: 'PENDING',
          is_available: false,
          created_at: '2026-07-22T06:00:00.000Z',
          accounts: {
            email: 'pending.worker@example.test',
            mobile: '+639171234567',
            status: 'ACTIVE',
          },
          worker_skills: [{ years: 2, service_categories: { name: 'Cleaning' } }],
          worker_verifications: { id: verificationId, status: 'PENDING' },
          bookings: [{ count: 0 }],
          reviews: [],
        },
      ]),
    });
  });
  await page.route('**/rest/v1/wallets*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ account_id: workerId, available_minor: 0 }]),
    }),
  );
}

test('pending worker appears in the admin review queue', async ({ page }) => {
  await useAdminFixture(page);
  await page.goto('/admin/workers');

  await expect(page.getByRole('heading', { name: 'Workers Management' })).toBeVisible();
  await expect(page.getByText('Pending Worker', { exact: true })).toBeVisible();
  await expect(page.getByText(workerId, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review Queue 1' }).click();
  await expect(page.getByText('Pending Worker', { exact: true })).toBeVisible();
  await expect(page.getByText('PENDING', { exact: true })).toBeVisible();
});
