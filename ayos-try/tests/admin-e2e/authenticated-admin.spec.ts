import { expect, test, type Page } from '@playwright/test';

const projectRef = 'qsurouiyvisykjkgjqmz';
const authStorageKey = `sb-${projectRef}-auth-token`;
const adminId = '58cbe239-f868-4b4c-8bc3-1b281b01da08';

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
  const user = {
    id: adminId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@local.com',
    email_confirmed_at: '2026-07-22T00:00:00.000Z',
    app_metadata: {
      provider: 'email',
      providers: ['email'],
      ayos_role: 'ADMIN',
    },
    user_metadata: {},
    created_at: '2026-07-22T00:00:00.000Z',
  };
  await page.addInitScript(
    ({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
    {
      key: authStorageKey,
      session: {
        access_token: accessToken(),
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
  await page.route('**/rest/v1/rpc/is_admin', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'true',
    }),
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
  await page.route('**/rest/v1/rpc/admin_dashboard_metrics', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accounts: 0,
        active_workers: 0,
        active_bookings: 0,
        successful_payment_total: 0,
        queued_ai_jobs: 0,
        open_support: 0,
      }),
    }),
  );
  for (const table of [
    'audit_logs',
    'payments',
    'bookings',
    'worker_profiles',
    'accounts',
    'notifications',
  ]) {
    await page.route(`**/rest/v1/${table}*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      }),
    );
  }
}

test('authenticated administrator dashboard has no desktop overflow', async ({ page }) => {
  await useAdminFixture(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard Overview' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page).toHaveScreenshot('admin-dashboard-desktop.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.01,
  });
});

test('authenticated administrator mobile drawer has no horizontal overflow', async ({ page }) => {
  await useAdminFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard Overview' })).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page).toHaveScreenshot('admin-dashboard-mobile-drawer.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.01,
  });
});
