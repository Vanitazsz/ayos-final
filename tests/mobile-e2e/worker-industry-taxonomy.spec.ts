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

test('worker signup normalizes the mobile number and opens email OTP', async ({ page }) => {
  let signupBody: { data?: { mobile?: string } } | null = null;
  await page.route('**/auth/v1/signup*', async (route) => {
    signupBody = route.request().postDataJSON() as {
      data?: { mobile?: string };
    };
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '98000000-0000-0000-0000-000000000001',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'phone.worker@example.test',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: signupBody?.data ?? {},
        identities: [],
        created_at: now,
        updated_at: now,
        confirmation_sent_at: now,
      }),
    });
  });

  await page.goto('/register-worker');
  await page.getByPlaceholder('Enter first name').fill('Phone');
  await page.getByPlaceholder('Enter last name').fill('Worker');
  await page.getByPlaceholder('Enter email address').fill('phone.worker@example.test');
  await page.getByPlaceholder('Enter mobile number').fill('0917 123 4567');
  await page.getByPlaceholder('MM/DD/YYYY').fill('01011990');
  await page.getByPlaceholder('Min. 8 chars, 1 Upper, 1 Number, 1 Special').fill('Taxonomy1!');
  await page.getByPlaceholder('Re-type password').fill('Taxonomy1!');
  await page.getByText('Next Step', { exact: true }).click();

  await page.getByPlaceholder('Type or select your industry').click();
  await page.getByText('Cleaning', { exact: true }).click();
  await page.getByText('Freelance / Independent', { exact: true }).click();
  await page.getByPlaceholder('Type or select skills').click();
  await page.getByText('Deep Cleaning', { exact: true }).click();
  await page.getByText('Next Step', { exact: true }).click();

  const addressInputs = page.locator('input');
  await addressInputs.nth(0).fill('12');
  await addressInputs.nth(1).fill('Sapphire Avenue');
  await addressInputs.nth(2).fill('Inocencio');
  await addressInputs.nth(3).fill('Trece Martires City');
  await addressInputs.nth(4).fill('Cavite');
  await addressInputs.nth(5).fill('4109');
  await addressInputs.nth(6).fill('Phone Contact');
  await addressInputs.nth(7).fill('+639181234567');
  await page.getByText('Select an option', { exact: true }).click();
  await page.getByText("Driver's License", { exact: true }).click();

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nS8AAAAASUVORK5CYII=',
    'base64',
  );
  for (const upload of [0, 1]) {
    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Upload from Gallery', { exact: true }).first().click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: `id-${upload}.png`,
      mimeType: 'image/png',
      buffer: png,
    });
  }
  await page.getByText('Next Step', { exact: true }).click();

  await page
    .getByText('I confirm that the information provided is accurate.', {
      exact: true,
    })
    .click();
  await page.getByText(/I agree to the Privacy Policy/).click();
  await page.getByText(/I agree to the Terms of Service/).click();
  await page.getByText('Submit Registration', { exact: true }).click();

  await expect(page).toHaveURL(/\/otp\?email=phone\.worker%40example\.test/);
  expect(signupBody?.data?.mobile).toBe('+639171234567');
  await expect(page.getByText('{}', { exact: true })).toHaveCount(0);
});
