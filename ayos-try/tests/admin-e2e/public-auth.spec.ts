import { expect, test } from '@playwright/test';

test('administrator sign-in renders accessible protected-auth controls', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Email Address')).toHaveAttribute('type', 'email');
  await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toHaveAttribute(
    'type',
    'password',
  );
  await expect(page.getByRole('button', { name: 'Sign In to Dashboard' })).toBeEnabled();
});

test('unauthenticated dashboard access redirects to sign-in', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('administrator sign-in has no mobile horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});
