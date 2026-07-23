import { expect, test } from '@playwright/test';

test('mobile entry exposes registration and sign-in paths', async ({ page }) => {
  await page.goto('/landing');
  await expect(page.getByText('A-yos', { exact: true })).toBeVisible();
  await expect(page.getByText('Sign in', { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await expect(page.getByText('Create an account')).toBeVisible();
  await expect(page.getByText('Register as Worker')).toBeVisible();
});

test('user registration path preserves the selected role', async ({ page }) => {
  await page.goto('/login');
  await page.getByText('Create an account').click();
  await expect(page).toHaveURL(/\/register$/);
  await page.getByText('I need services').click();
  await expect(page.getByText('Create Account', { exact: true })).toBeVisible();
});

test('entry layout has no tablet horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/login');
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test('registration displays readable validation messages', async ({ page }) => {
  await page.goto('/register');
  await page.getByText('I need services').click();
  await page.getByLabel('Full Name').fill('Juan Dela Cruz');
  await page.getByLabel('Mobile Number').fill('123');
  await page.getByLabel('Email').fill('juan@example.com');
  await page.getByLabel('Password', { exact: true }).fill('lowercase123');
  await page.getByLabel('Confirm Password').fill('lowercase123');
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Sign Up' }).click();

  await expect(page.getByText('Enter a valid Philippine mobile number')).toBeVisible();
  await expect(page.getByText('Password must include an uppercase letter')).toBeVisible();
  await expect(page.getByText(/invalid_format|pattern|regex/)).toHaveCount(0);
});

test('sign-in retains Google and excludes X and Apple authentication', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await expect(page.getByText(/continue with (x|apple)/i)).toHaveCount(0);
  await expect(page.locator('[aria-label*="Apple" i], [aria-label="X"]')).toHaveCount(0);
});
