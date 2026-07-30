import { expect, test, type Page } from '@playwright/test';

const workerId = '99000000-0000-4000-8000-000000000011';
const industryId = '99000000-0000-4000-8000-000000000012';
const drainSkillId = '99000000-0000-4000-8000-000000000013';
const fixtureSkillId = '99000000-0000-4000-8000-000000000014';
const staleSkillId = '99000000-0000-4000-8000-000000000015';
const staleIndustryId = '99000000-0000-4000-8000-000000000016';
const authStorageKey = 'sb-qsurouiyvisykjkgjqmz-auth-token';

type SavedSkill = {
  categoryId: string;
  years: number;
  rateMinor: number | null;
};

function accessToken() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: workerId,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3_600,
  })}.test-signature`;
}

async function useWorkerFixture(
  page: Page,
  savedSkills: SavedSkill[] = [
    { categoryId: drainSkillId, years: 4, rateMinor: 60_000 },
    { categoryId: fixtureSkillId, years: 4, rateMinor: 70_000 },
    { categoryId: staleSkillId, years: 4, rateMinor: 80_000 },
  ],
  savedIndustryIds = [industryId],
  getRateReady = () => true,
) {
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
  await page.route('**/rest/v1/rpc/get_my_worker_matching_readiness', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accountEligible: true,
        verificationStatus: 'APPROVED',
        skillsReady: true,
        rateReady: getRateReady(),
        serviceAreaReady: true,
        scheduleReady: true,
        online: false,
        setupComplete: true,
        matchable: false,
      }),
    }),
  );
  await page.route('**/rest/v1/rpc/get_my_worker_skills', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        primaryIndustryId: industryId,
        selectedIndustryIds: savedIndustryIds,
        skills: savedSkills,
        rateReady: savedSkills.some((skill) => skill.rateMinor != null),
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
}

test('worker sees the exact industries, skills, and rates last saved', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useWorkerFixture(
    page,
    [
      { categoryId: fixtureSkillId, years: 5, rateMinor: 82_550 },
      { categoryId: staleSkillId, years: 5, rateMinor: 94_000 },
    ],
    [industryId, staleIndustryId],
  );

  await page.goto('/industry-skills');
  await expect(page.getByText('Plumbing Skills & Services', { exact: true })).toBeVisible();
  await expect(page.getByText('Electrical Skills & Services', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Drain Unclogging service rate in PHP')).toHaveCount(0);
  await expect(page.getByLabel('Fixture Installation service rate in PHP')).toHaveValue('825.5');
  await expect(page.getByLabel('Stale Electrical Skill service rate in PHP')).toHaveValue('940');
  await expect(page.getByText('Your service rate (PHP/₱)', { exact: true })).toHaveCount(2);
});

test('worker saves per-skill rates and confirms before returning to profile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let rateReady = false;
  await useWorkerFixture(page, undefined, undefined, () => rateReady);

  let savedPayload: Record<string, unknown> | null = null;
  await page.route('**/rest/v1/rpc/save_my_worker_skills', async (route) => {
    savedPayload = route.request().postDataJSON();
    rateReady = true;
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
  await page.getByText('Electrical', { exact: true }).click();
  await expect(page.getByText('Electrical Skills & Services', { exact: true })).toBeVisible();
  await page.getByText('Stale Electrical Skill', { exact: true }).click();
  await page.getByLabel('Drain Unclogging service rate in PHP').fill('650');
  await page.getByLabel('Fixture Installation service rate in PHP').fill('825.50');
  await page.getByLabel('Stale Electrical Skill service rate in PHP').fill('900');
  await page.getByRole('button', { name: 'Save Industry & Skills' }).click();

  await expect(page.getByText('Industry & Skills Saved!', { exact: true })).toBeVisible();
  const confirmationOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(confirmationOverflow).toBeLessThanOrEqual(1);
  expect(savedPayload).toEqual({
    p_industry_ids: [industryId, staleIndustryId],
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
      {
        categoryId: staleSkillId,
        years: 4,
        rateMinor: 90_000,
      },
    ],
  });

  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.goto('/service-setup');
  await expect(page.getByText('Service rate set in Industry & Skills')).toHaveCSS(
    'color',
    'rgb(16, 185, 129)',
  );
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

  await expect(page.getByText('INVALID_WORKER_SKILLS', { exact: true })).toBeVisible();
  await expect(page.getByText('Industry & Skills Saved!', { exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/industry-skills$/);
});

test('single-industry save falls back to the legacy RPC during migration rollout', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useWorkerFixture(page, [{ categoryId: fixtureSkillId, years: 5, rateMinor: 82_550 }]);
  let legacyPayload: Record<string, unknown> | null = null;
  await page.route('**/rest/v1/rpc/save_my_worker_skills', async (route) => {
    const payload = route.request().postDataJSON();
    if ('p_industry_ids' in payload) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'PGRST202',
          message: 'Could not find the function in the schema cache',
        }),
      });
      return;
    }
    legacyPayload = payload;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ primaryIndustryId: industryId, skillCount: 1 }),
    });
  });

  await page.goto('/industry-skills');
  await page.getByRole('button', { name: 'Save Industry & Skills' }).click();
  await expect(page.getByText('Industry & Skills Saved!', { exact: true })).toBeVisible();
  expect(legacyPayload).toMatchObject({ p_primary_industry_id: industryId });
});
