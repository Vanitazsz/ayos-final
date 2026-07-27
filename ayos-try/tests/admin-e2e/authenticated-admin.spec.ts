import { expect, test } from '@playwright/test';

const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

test.describe.configure({ mode: 'serial' });

async function signIn(page: import('@playwright/test').Page) {
  test.skip(!email || !password, 'Local administrator fixture is not configured.');
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: /sign in to dashboard/i }).click();
  await expect(page).toHaveURL(/\/dashboard(?:$|\?)/);
  await expect(page.getByRole('heading', { name: 'Dashboard Overview' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Total Revenue' })).toBeVisible();
  await expect(page.getByTestId('stat-card-value')).toHaveCount(6);
  await expect(page.getByTestId('dashboard-chart')).toHaveCount(2);
}

function liveDashboardRegions(page: import('@playwright/test').Page) {
  return [
    page.getByTestId('current-date'),
    page.getByTestId('stat-card-value'),
    page.getByTestId('dashboard-chart'),
    page.getByTestId('dashboard-live-list'),
  ];
}

test('authenticated administrator dashboard has no desktop overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page).toHaveScreenshot('admin-dashboard-desktop.png', {
    animations: 'disabled',
    mask: liveDashboardRegions(page),
    maxDiffPixelRatio: 0.01,
  });
});

test('authenticated administrator mobile drawer has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Administrator navigation' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page).toHaveScreenshot('admin-dashboard-mobile-drawer.png', {
    animations: 'disabled',
    mask: liveDashboardRegions(page),
    maxDiffPixelRatio: 0.01,
  });
});
