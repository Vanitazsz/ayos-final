import { expect, test, type Page } from '@playwright/test';

const industries = [
  'Cleaning',
  'Electrical',
  'Plumbing',
  'Carpentry',
  'Painting',
  'Masonry & Tiling',
  'Air Conditioning & Refrigeration',
  'Appliance Repair',
  'Landscaping & Gardening',
  'Roofing & Waterproofing',
] as const;

async function openIndustryStep(page: Page) {
  await page.goto('/register-worker');
  await page.getByPlaceholder('Enter first name').fill('Taxonomy');
  await page.getByPlaceholder('Enter last name').fill('Worker');
  await page.getByPlaceholder('Enter email address').fill('taxonomy.worker@example.test');
  await page.getByPlaceholder('Enter mobile number').fill('09171234567');
  await page.getByPlaceholder('MM/DD/YYYY').fill('01011990');
  await page.getByPlaceholder('Min. 8 chars, 1 Upper, 1 Number, 1 Special').fill('Taxonomy1!');
  await page.getByPlaceholder('Re-type password').fill('Taxonomy1!');
  await page.getByText('Next Step', { exact: true }).click();
  await expect(page.getByText('Industry & Skills', { exact: true })).toBeVisible();
}

test('worker registration loads and searches all hosted industries', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openIndustryStep(page);

  const industryInput = page.getByPlaceholder('Type or select your industry');
  await industryInput.click();
  const dropdown = page.getByTestId('autocomplete-suggestions');
  await expect(dropdown).toBeVisible();
  await expect
    .poll(() => dropdown.evaluate((element) => element.scrollHeight > element.clientHeight))
    .toBe(true);
  for (const industry of industries) {
    await expect(page.getByText(industry, { exact: true })).toBeVisible();
  }
  await expect(page.getByText('Aircon Repair', { exact: true })).toHaveCount(0);

  await industryInput.fill('Roofing');
  await page.getByText('Roofing & Waterproofing', { exact: true }).click();
  await expect(page.getByPlaceholder('Type or select skills')).toBeVisible();
  await page.getByPlaceholder('Type or select skills').click();
  await expect(page.getByText('Roof Inspection & Repair', { exact: true })).toBeVisible();
  await expect(page.getByText('Waterproofing', { exact: true })).toBeVisible();

  await page.getByPlaceholder('Type or select skills').fill('fictional custom skill');
  await expect(page.getByText(/as custom/i)).toHaveCount(0);
});

test('industry step has no desktop horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openIndustryStep(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
