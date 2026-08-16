import { expect, test } from '@playwright/test';

test('mobile entry redirects directly to sign in', async ({ page }) => {
  await page.goto('/landing');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Welcome back', { exact: true })).toBeVisible();
  await expect(page.getByText('Register as Worker')).toHaveCount(0);
});

test('sign-in opens the existing registration chooser', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByText('Create an account').click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole('heading', { name: 'Get Started', exact: true })).toBeVisible();
});

test('chooser navigates to a separate create-account page', async ({ page }) => {
  await page.goto('/register');
  await page.getByRole('button', { name: 'I need services' }).click();
  await expect(page).toHaveURL(/\/create-account$/);
  await expect(page.getByRole('heading', { name: 'Create account', exact: true })).toBeVisible();
  await expect(page.getByText('Send email code', { exact: true })).toBeVisible();
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

test('create-account layout has no horizontal overflow on any viewport', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/create-account');
    await expect(page.getByRole('heading', { name: 'Create account', exact: true })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth, `no overflow at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(dimensions.clientWidth);
  }
});

test('registration displays readable validation messages', async ({ page }) => {
  await page.goto('/create-account');
  await page.getByLabel('Full name').fill('Juan Dela Cruz');
  await page.getByLabel('Mobile number').fill('123');
  await page.getByLabel('Email', { exact: true }).fill('juan@example.com');
  await page.getByLabel('Password', { exact: true }).fill('lowercase123');
  await page.getByLabel('Confirm password').fill('lowercase123');
  const termsCheckbox = page.getByRole('checkbox');
  await termsCheckbox.click();
  await expect(termsCheckbox).toHaveAttribute('aria-checked', 'true');
  await page.getByText('Send email code', { exact: true }).click();

  await expect(
    page.getByText('Enter a valid PH mobile number, e.g. 09171234567 or +639171234567.'),
  ).toBeVisible();
  await expect(page.getByText('Use 8+ characters with uppercase, number, and symbol')).toBeVisible();
  await expect(page.getByText(/invalid_format|pattern|regex/)).toHaveCount(0);
});

test('sign-in retains Google and excludes X and Apple authentication', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await expect(page.getByText(/continue with (x|apple)/i)).toHaveCount(0);
  await expect(page.locator('[aria-label*="Apple" i], [aria-label="X"]')).toHaveCount(0);
});

test('password stays single-line with ellipsis after blur', async ({ page }) => {
  await page.goto('/sign-in');
  const password = page.getByRole('textbox', { name: 'Password' });
  await password.fill('a'.repeat(60));
  await password.evaluate((el) => (el as HTMLInputElement).blur());
  const metrics = await password.evaluate((el) => {
    const input = el as HTMLInputElement;
    const style = getComputedStyle(input);
    return {
      textOverflow: style.textOverflow,
      whiteSpace: style.whiteSpace,
      overflow: style.overflow,
      clientHeight: input.clientHeight,
      scrollHeight: input.scrollHeight,
    };
  });
  expect(metrics.textOverflow).toBe('ellipsis');
  expect(metrics.whiteSpace).toBe('nowrap');
  expect(['hidden', 'clip']).toContain(metrics.overflow);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight);
});
