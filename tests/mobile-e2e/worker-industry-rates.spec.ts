import { expect, test, type Page } from '@playwright/test';

const workerId = '99000000-0000-4000-8000-000000000011';
const industryId = '99000000-0000-4000-8000-000000000012';
const drainSkillId = '99000000-0000-4000-8000-000000000013';
const fixtureSkillId = '99000000-0000-4000-8000-000000000014';
const staleSkillId = '99000000-0000-4000-8000-000000000015';
const staleIndustryId = '99000000-0000-4000-8000-000000000016';
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

async function useWorkerFixture(page: Page) {
  const token = accessToken();
  const user = {
    id: workerId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'rates.worker@example.test',
    email_confirmed_at: '2026-07-28T00:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { role: 'WORKER' },
    created_at: '2026-07-28T00:00:00.000Z',
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
        profile: { display_name: 'Rates Worker' },
        email_verified: true,
        profile_complete: true,
      }),
    }),
  );
  await page.route('**/rest/v1/industries*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: industryId,
          slug: 'plumbing',
          name: 'Plumbing',
          sort_order: 1,
          service_categories: [
            {
              id: drainSkillId,
              slug: 'drain-unclogging',
              name: 'Drain Unclogging',
              is_active: true,
            },
            {
              id: fixtureSkillId,
              slug: 'fixture-installation',
              name: 'Fixture Installation',
              is_active: true,
            },
          ],
        },
        {
          id: staleIndustryId,
          slug: 'electrical',
          name: 'Electrical',
          sort_order: 2,
          service_categories: [
            {
              id: staleSkillId,
              slug: 'stale-electrical-skill',
              name: 'Stale Electrical Skill',
              is_active: true,
            },
          ],
        },
      ]),
    }),
  );
  await page.route('**/rest/v1/worker_profiles*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ primary_industry_id: industryId }),
    }),
  );
  await page.route('**/rest/v1/worker_skills*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          category_id: drainSkillId,
          years: 4,
          rate_minor: 60_000,
        },
        {
          category_id: fixtureSkillId,
          years: 4,
          rate_minor: 70_000,
        },
        {
          category_id: staleSkillId,
          years: 4,
          rate_minor: 80_000,
        },
      ]),
    }),
  );
}

test('worker saves per-skill rates and confirms before returning to profile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useWorkerFixture(page);

  let savedPayload: Record<string, unknown> | null = null;
  await page.route('**/rest/v1/rpc/save_my_worker_skills', async (route) => {
    savedPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        primaryIndustryId: industryId,
        skillCount: 2,
      }),
    });
  });

  await page.goto('/industry-skills');
  await expect(page.getByText('Plumbing Skills & Services', { exact: true })).toBeVisible();
  await expect(page.getByText('Your service rate (PHP/₱)', { exact: true })).toHaveCount(2);
  await page.getByLabel('Drain Unclogging service rate in PHP').fill('650');
  await page.getByLabel('Fixture Installation service rate in PHP').fill('825.50');
  await page.getByRole('button', { name: 'Save Industry & Skills' }).click();

  await expect(page.getByText('Industry & Skills Saved!', { exact: true })).toBeVisible();
  const confirmationOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(confirmationOverflow).toBeLessThanOrEqual(1);
  expect(savedPayload).toEqual({
    p_primary_industry_id: industryId,
    p_skills: [
      {
        categoryId: drainSkillId,
        years: 4,
        rateMinor: 65_000,
      },
      {
        categoryId: fixtureSkillId,
        years: 4,
        rateMinor: 82_550,
      },
    ],
  });

  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page).toHaveURL(/\/profile$/);
});

test('failed rate save stays on screen and does not show confirmation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useWorkerFixture(page);
  await page.route('**/rest/v1/rpc/save_my_worker_skills', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        code: '22023',
        message: 'INVALID_WORKER_SKILLS',
      }),
    });
  });

  await page.goto('/industry-skills');
  await expect(page.getByText('Plumbing Skills & Services', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save Industry & Skills' }).click();

  await expect(page.getByText('Request failed', { exact: true })).toBeVisible();
  await expect(page.getByText('Industry & Skills Saved!', { exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/industry-skills$/);
});
