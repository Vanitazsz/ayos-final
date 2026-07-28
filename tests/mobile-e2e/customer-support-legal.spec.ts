import { expect, test, type Page } from '@playwright/test';

const accountId = '55555555-5555-4555-8555-555555555555';
const authStorageKey = 'sb-qsurouiyvisykjkgjqmz-auth-token';

const helpPage = {
  title: 'Help Center',
  body: [
    'Find guidance for requesting and managing services through A-YOS.',
    '## Requesting a service',
    'Choose a service, describe the issue, and confirm the service location.',
    '## Safety',
    'Protect your password and verification codes.',
  ].join('\n\n'),
  version: '2026-07-23',
  updated_at: '2026-07-23T09:00:00.000Z',
};

const privacyPage = {
  title: 'Privacy Policy',
  body: [
    'This notice explains how A-YOS handles information.',
    '## Information we collect',
    'A-YOS processes account, booking, message, and location information.',
    '## Optional AI processing',
    'AI analysis is optional and requires request-specific consent.',
  ].join('\n\n'),
  version: '2026-07-23',
  updated_at: '2026-07-23T09:00:00.000Z',
};

function accessToken(role: 'USER' | 'WORKER') {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: accountId,
    role: 'authenticated',
    account_role: role,
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3_600,
  })}.test-signature`;
}

async function useAccountFixture(page: Page, role: 'USER' | 'WORKER' = 'USER') {
  const token = accessToken(role);
  const user = {
    id: accountId,
    aud: 'authenticated',
    role: 'authenticated',
    email: `${role.toLowerCase()}@example.test`,
    email_confirmed_at: '2026-07-23T00:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-07-23T00:00:00.000Z',
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
          role,
          password_changed_at: null,
        },
        active_role: role,
        profile: {
          display_name: role === 'USER' ? 'Customer Fixture' : 'Worker Fixture',
          avatar_path: null,
          verification_status: 'verified',
          subdivision_id: null,
          preferred_locale: 'en',
        },
        default_address: null,
        email_verified: true,
        profile_complete: true,
      }),
    }),
  );
}

async function routePublishedContent(page: Page) {
  await page.route('**/rest/v1/content_pages*', (route) => {
    const url = new URL(route.request().url());
    const key = url.searchParams.get('key') ?? '';
    const content = key.includes('HELP_CENTER') ? helpPage : privacyPage;
    return route.fulfill({
      status: 200,
      contentType: 'application/vnd.pgrst.object+json',
      body: JSON.stringify(content),
    });
  });
}

test('customer Profile opens both published content pages and returns to Profile', async ({
  page,
}) => {
  await useAccountFixture(page);
  await routePublishedContent(page);

  await page.goto('/profile');
  await page.getByText('Help Center', { exact: true }).click();
  await expect(page).toHaveURL(/\/help-center$/);
  await expect(page.getByText('Requesting a service', { exact: true })).toBeVisible();
  await expect(page.getByText('Version 2026-07-23')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Help Center' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Back to profile' }).click();
  await expect(page).toHaveURL(/\/profile$/);

  await page.getByText('Privacy Policy', { exact: true }).click();
  await expect(page).toHaveURL(/\/privacy-policy$/);
  await expect(page.getByText('Optional AI processing', { exact: true })).toBeVisible();
});

test('published content page supports unavailable, failure, and retry states', async ({ page }) => {
  await useAccountFixture(page);
  let requestCount = 0;
  await page.route('**/rest/v1/content_pages*', (route) => {
    requestCount += 1;
    if (requestCount === 1) {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'XX000',
          message: 'Temporary database error',
        }),
      });
    }
    if (requestCount === 2) {
      return route.fulfill({
        status: 200,
        contentType: 'application/vnd.pgrst.object+json',
        body: JSON.stringify(helpPage),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/vnd.pgrst.object+json',
      body: JSON.stringify({
        title: 'Help Center',
        body: 'Local development help content. Replace before production.',
        version: 'local-1',
        updated_at: '2026-07-20T00:00:00.000Z',
      }),
    });
  });

  await page.goto('/help-center');
  await expect(page.getByText('Unable to load this page', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('Requesting a service', { exact: true })).toBeVisible();

  await page.goto('/privacy-policy');
  await expect(page.getByText('Page unavailable', { exact: true })).toBeVisible();
});

test('customer-only content routes reject unauthenticated and worker access', async ({ page }) => {
  await page.goto('/help-center');
  await expect(page).toHaveURL(/\/login$/);

  await useAccountFixture(page, 'WORKER');
  let contentRequests = 0;
  await page.route('**/rest/v1/content_pages*', (route) => {
    contentRequests += 1;
    return route.abort();
  });
  await page.goto('/privacy-policy');
  await expect(page).not.toHaveURL(/\/privacy-policy$/);
  expect(contentRequests).toBe(0);
});

for (const [name, width, height] of [
  ['phone', 390, 844],
  ['tablet', 768, 1024],
  ['desktop', 1440, 900],
] as const) {
  test(`privacy content remains scrollable without horizontal overflow on ${name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await useAccountFixture(page);
    await page.route('**/rest/v1/content_pages*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.pgrst.object+json',
        body: JSON.stringify({
          ...privacyPage,
          body: Array.from({ length: 8 }, (_, index) =>
            [
              `## Privacy section ${index + 1}`,
              'A-YOS limits access according to account role, ownership, and workflow participation while preserving required records.',
            ].join('\n\n'),
          ).join('\n\n'),
        }),
      }),
    );

    await page.goto('/privacy-policy');
    await expect(page.getByText('Privacy section 8', { exact: true })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      hasVerticalScrollRegion: Array.from(document.querySelectorAll<HTMLElement>('*')).some(
        (element) => {
          const overflowY = window.getComputedStyle(element).overflowY;
          return (
            (overflowY === 'auto' || overflowY === 'scroll') &&
            element.scrollHeight > element.clientHeight
          );
        },
      ),
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    expect(dimensions.hasVerticalScrollRegion).toBe(true);
  });
}
