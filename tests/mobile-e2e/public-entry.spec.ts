import { expect, test } from '@playwright/test';

test('mobile entry redirects directly to sign in', async ({ page }) => {
  await page.goto('/landing');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Sign in', { exact: true })).toBeVisible();
  await expect(page.getByText('Register as Worker')).toHaveCount(0);
});

test('sign-in opens the existing registration chooser', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByText('Create an account').click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole('heading', { name: 'Get Started', exact: true })).toBeVisible();
});

test('entry layout has no tablet horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/sign-in');
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test('registration displays readable validation messages', async ({ page }) => {
  await page.goto('/register?role=USER');
  await page.getByLabel('Full name').fill('Juan Dela Cruz');
  await page.getByLabel('Mobile number (+63…)').fill('123');
  await page.getByLabel('Email').fill('juan@example.com');
  await page.getByLabel('Password', { exact: true }).fill('lowercase123');
  await page.getByLabel('Confirm password').fill('lowercase123');
  const termsSwitch = page.getByRole('switch');
  await termsSwitch.click();
  await expect(termsSwitch).toHaveAttribute('aria-checked', 'true');
  await page.getByText('Send email code', { exact: true }).click();

  await expect(
    page.getByText('Enter a mobile number with country code, for example +639171234567.'),
  ).toBeVisible();
  await expect(page.getByText('Password must include an uppercase letter.')).toBeVisible();
  await expect(page.getByText(/invalid_format|pattern|regex/)).toHaveCount(0);
});

test('sign-in retains Google and excludes X and Apple authentication', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await expect(page.getByText(/continue with (x|apple)/i)).toHaveCount(0);
  await expect(page.locator('[aria-label*="Apple" i], [aria-label="X"]')).toHaveCount(0);
});
