import { expect, test } from '@playwright/test';

test('expired Edge Function authentication redirects to sign-in with a clear notice', async ({
  page,
}) => {
  const userId = '032a57ad-8355-4751-99f8-2b1b4cc8ebf9';
  const session = {
    access_token: 'stale-access-token',
    refresh_token: 'stale-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'customer@example.com',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };

  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: 'sb-qsurouiyvisykjkgjqmz-auth-token',
    value: session,
  });
  await page.route('**/auth/v1/user', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    }),
  );
  await page.route('**/rest/v1/rpc/get_my_profile', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        account: {
          id: userId,
          email: session.user.email,
          mobile: '+639171234567',
          role: 'USER',
          status: 'ACTIVE',
        },
        profile: { display_name: 'Test Customer' },
        active_role: 'USER',
        email_verified: true,
        profile_complete: true,
      }),
    }),
  );
  await page.route('**/functions/v1/ai-analyze-request', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        code: 'authentication_required',
        message: 'Authentication required',
      }),
    }),
  );
  await page.route('**/auth/v1/token?grant_type=refresh_token', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid_grant', error_description: 'Refresh token expired' }),
    }),
  );

  await page.goto('/new-request/issue-summary');

  await expect(page.getByText('Sign in', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Your session expired. Please sign in again.')).toBeVisible();
  await expect(page.getByText('Authentication required')).toHaveCount(0);
});
