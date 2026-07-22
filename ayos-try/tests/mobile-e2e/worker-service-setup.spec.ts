import { expect, test, type Page } from '@playwright/test';

const workerId = '99000000-0000-4000-8000-000000000001';
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

const initialReadiness = {
  accountEligible: true,
  verificationStatus: 'APPROVED',
  skillsReady: true,
  serviceAreaReady: true,
  scheduleReady: true,
  online: false,
  setupComplete: true,
  matchable: false,
  latitude: 14.28,
  longitude: 120.88,
  serviceArea: 'Trece Martires City, Cavite',
  radiusMeters: 20_000,
  schedule: [
    {
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '17:00',
      timezone: 'Asia/Manila',
    },
  ],
};

async function useWorkerFixture(page: Page) {
  const token = accessToken();
  const user = {
    id: workerId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'worker@example.test',
    email_confirmed_at: '2026-07-22T00:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { role: 'WORKER' },
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
          id: workerId,
          email: user.email,
          mobile: '+639171234567',
          status: 'ACTIVE',
          role: 'WORKER',
        },
        active_role: 'WORKER',
        profile: { display_name: 'Ready Worker' },
        email_verified: true,
        profile_complete: true,
      }),
    }),
  );
  await page.route('**/rest/v1/rpc/get_my_worker_matching_readiness', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(initialReadiness),
    }),
  );
}

test('approved worker can complete setup and go online', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useWorkerFixture(page);
  let savedPayload: Record<string, unknown> | null = null;
  await page.route('**/rest/v1/rpc/save_my_worker_matching_setup', async (route) => {
    savedPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...initialReadiness,
        online: true,
        matchable: true,
      }),
    });
  });

  await page.goto('/service-setup');
  await expect(page.getByText('Service Availability', { exact: true })).toBeVisible();
  await expect(page.getByText('Admin verification approved')).toBeVisible();
  await expect(page.getByText('Service origin and radius')).toBeVisible();

  await page.getByLabel('Available for matching').click();
  await page.getByRole('button', { name: 'Save Service Availability' }).click();

  await expect(page.getByText('Service availability saved.')).toBeVisible();
  expect(savedPayload).toMatchObject({
    p_latitude: 14.28,
    p_longitude: 120.88,
    p_radius_meters: 20_000,
    p_online: true,
  });
});

for (const viewport of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
]) {
  test(`worker service setup has no ${viewport.name} horizontal overflow`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await useWorkerFixture(page);
    await page.goto('/service-setup');
    await expect(page.getByText('Matching readiness')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
