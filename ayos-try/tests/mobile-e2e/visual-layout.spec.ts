import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
] as const;

for (const viewport of viewports) {
  test(`mobile entry ${viewport.name} layout is stable and has no overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/landing');
    await expect(page.getByText('Book trusted service nearby.')).toBeVisible();
    await expect(page.getByText(/confirm Cash settlement/)).toBeVisible();
    await expect(page.getByText(/Cash or GCash/)).toHaveCount(0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page).toHaveScreenshot(`mobile-landing-${viewport.name}.png`, {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
      fullPage: true,
    });
  });
}
