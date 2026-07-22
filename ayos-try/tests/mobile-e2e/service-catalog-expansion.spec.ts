import { expect, test, type Page } from '@playwright/test';
import { join } from 'node:path';

const accountId = '11111111-1111-4111-8111-111111111111';
const authStorageKey = 'sb-qsurouiyvisykjkgjqmz-auth-token';
const services = [
  'Aircon Cleaning & Maintenance',
  'Aircon Installation',
  'Aircon Repair',
  'Cabinet Installation & Repair',
  'Carpet & Upholstery Cleaning',
  'Ceiling & Partition Installation',
  'Cleaning',
  'Concrete Repair',
  'Custom Woodwork',
  'Deep Cleaning',
  'Decorative Finishing',
  'Door & Window Repair',
].map((name, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  name,
  slug: name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, ''),
  minimum_price_minor: 10_000,
  maximum_price_minor: 50_000,
  is_safety_critical: false,
}));

const geocodedAddress = {
  providerId: 'openrouteservice:test-address',
  line: 'Makati City Hall',
  barangay: 'Poblacion',
  city: 'Makati',
  province: 'Metro Manila',
  postalCode: '1210',
  displayLabel: 'Makati City Hall, Poblacion, Makati, Metro Manila 1210',
  confidence: 0.95,
  longitude: 121.0285,
  latitude: 14.5707,
  provider: 'OPENROUTESERVICE',
};

function accessToken() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: accountId,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3_600,
  })}.test-signature`;
}

async function useCustomerFixture(
  page: Page,
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected' = 'verified',
) {
  const token = accessToken();
  const user = {
    id: accountId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'customer@example.test',
    email_confirmed_at: '2026-07-22T00:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-07-22T00:00:00.000Z',
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
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }),
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
          role: 'USER',
          password_changed_at: null,
        },
        active_role: 'USER',
        profile: {
          display_name: 'Customer Fixture',
          avatar_path: null,
          verification_status: verificationStatus,
          subdivision_id: null,
          preferred_locale: 'en',
        },
        default_address: null,
        email_verified: true,
        profile_complete: true,
      }),
    }),
  );
  await page.route('**/rest/v1/service_categories*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(services) }),
  );
  await page.route('**/rest/v1/worker_profiles*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/rest/v1/bookings*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/rest/v1/addresses*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/functions/v1/geocode-search*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { items: [geocodedAddress] } }),
    }),
  );
  await page.route('**/functions/v1/geocode-reverse*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { result: geocodedAddress } }),
    }),
  );
}

test('customer home reveals one additional service row per tap', async ({ page }) => {
  await useCustomerFixture(page);
  await page.goto('/home');

  const cards = page.getByTestId('home-service-category');
  await expect(cards).toHaveCount(8);
  await page.getByRole('button', { name: 'See more service categories' }).click();
  await expect(cards).toHaveCount(12);
  await expect(page.getByRole('button', { name: 'See more service categories' })).toHaveCount(0);
});

test('customer home searches and clears real service results', async ({ page }) => {
  await useCustomerFixture(page);
  await page.goto('/home');

  const search = page.getByLabel('Search services');
  await search.fill('Aircon');
  await expect(page.getByTestId('home-service-category')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'See more service categories' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Clear service search' }).click();
  await expect(page.getByTestId('home-service-category')).toHaveCount(8);
});

test('request creation reveals services incrementally and preserves selection', async ({
  page,
}) => {
  await useCustomerFixture(page);
  await page.goto('/new-request/create');

  const options = page.getByTestId('request-service-option');
  const seeMore = page.getByRole('button', { name: 'See more services' });
  await expect(options).toHaveCount(4);
  await seeMore.click();
  await expect(options).toHaveCount(8);
  await seeMore.click();
  await expect(options).toHaveCount(12);
  await expect(seeMore).toHaveCount(0);

  const selected = page.getByRole('radio', { name: services[11].name });
  await selected.click();
  await expect(selected).toBeChecked();
});

test('request service search filters live results and preserves the selected service', async ({
  page,
}) => {
  await useCustomerFixture(page);
  await page.goto('/new-request/create');

  await page.getByRole('button', { name: 'Search services' }).click();
  const search = page.getByLabel('Search available services');
  await search.fill('Cabinet');
  await expect(page.getByTestId('request-service-option')).toHaveCount(1);
  const cabinet = page.getByRole('radio', { name: 'Cabinet Installation & Repair' });
  await cabinet.click();
  await expect(cabinet).toBeChecked();

  await search.fill('not-a-real-service');
  await expect(page.getByText('No services found', { exact: true })).toBeVisible();
  await search.fill('Cabinet');
  await expect(page.getByRole('radio', { name: 'Cabinet Installation & Repair' })).toBeChecked();
});

test('request requires a confirmed point and continues after selecting a geocoded address', async ({
  page,
}) => {
  await useCustomerFixture(page);
  await page.goto('/new-request/create');

  await page.getByTestId('request-service-option').first().click();
  await page
    .getByPlaceholder('e.g. The sink is leaking under the cabinet...')
    .fill('The air conditioner is leaking water inside the room.');
  const address = page.getByPlaceholder('Enter complete address');
  await address.fill('Makati City Hall');

  await page.getByText('Continue without AI', { exact: true }).click();
  await expect(
    page.getByText('Select a suggested address or confirm your current location.', { exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: `Use address ${geocodedAddress.displayLabel}` }).click();
  await expect(page.getByText('✓ Location Verified', { exact: true })).toBeVisible();
  await page.getByText('Continue without AI', { exact: true }).click();
  await expect(page).toHaveURL(/\/new-request\/matching/);
});

test('header current-location control confirms GPS and reverse-geocoded address', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({
    latitude: geocodedAddress.latitude,
    longitude: geocodedAddress.longitude,
  });
  await useCustomerFixture(page);
  await page.goto('/new-request/create');

  await page.getByRole('button', { name: 'Use current location' }).click();
  await expect(page.getByText('✓ Location Verified', { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Enter complete address')).toHaveValue(
    geocodedAddress.displayLabel,
  );
});

test('GPS point remains usable when reverse geocoding is unavailable', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({
    latitude: geocodedAddress.latitude,
    longitude: geocodedAddress.longitude,
  });
  await useCustomerFixture(page);
  await page.unroute('**/functions/v1/geocode-reverse*');
  await page.route('**/functions/v1/geocode-reverse*', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        message: 'OpenRouteService is unavailable',
        errors: { code: 'geocoding_unavailable' },
      }),
    }),
  );
  await page.goto('/new-request/create');

  await page.getByRole('button', { name: 'Use current location' }).click();
  await expect(page.getByText('✓ Location Verified', { exact: true })).toBeVisible();
  await expect(page.getByText(/map point is confirmed/i)).toBeVisible();

  await page.getByTestId('request-service-option').first().click();
  await page
    .getByPlaceholder('e.g. The sink is leaking under the cabinet...')
    .fill('The air conditioner needs inspection and repair.');
  await page
    .getByPlaceholder('Enter complete address')
    .fill('Manual address near Makati City Hall');
  await page.getByPlaceholder('Barangay').fill('Poblacion');
  await page.getByPlaceholder('City or municipality').fill('Makati');
  await page.getByPlaceholder('Province').fill('Metro Manila');
  await page.getByText('Continue without AI', { exact: true }).click();
  await expect(page).toHaveURL(/\/new-request\/matching/);
});

test('address search falls back to manual entry without showing a persistent error', async ({
  page,
}) => {
  await useCustomerFixture(page);
  await page.unroute('**/functions/v1/geocode-search*');
  await page.route('**/functions/v1/geocode-search*', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        code: 'geocoding_unavailable',
        message: 'Provider unavailable',
      }),
    }),
  );
  await page.goto('/new-request/create');

  await page.getByPlaceholder('Enter complete address').fill('Trece Martires City, Cavite');
  await expect(page.getByText(/typed address is saved/i)).toBeVisible();
  await expect(page.getByText('Complete the address', { exact: true })).toBeVisible();
  await expect(page.getByText(/That address could not be found/i)).toHaveCount(0);
  await expect(page.getByText(/Edge Function returned a non-2xx/i)).toHaveCount(0);
});

test('AI consent blocks only the AI continuation path', async ({ page }) => {
  await useCustomerFixture(page);
  await page.goto('/new-request/create');

  await page.getByTestId('request-service-option').first().click();
  await page
    .getByPlaceholder('e.g. The sink is leaking under the cabinet...')
    .fill('The air conditioner is leaking water inside the room.');
  await page.getByPlaceholder('Enter complete address').fill('Makati City Hall');
  await page.getByRole('button', { name: `Use address ${geocodedAddress.displayLabel}` }).click();

  await page.getByText('Continue', { exact: true }).click();
  await expect(page.getByText(/Accept AI processing consent/)).toBeVisible();
  await page.getByRole('checkbox').click();
  await page.getByText('Continue', { exact: true }).click();
  await expect(page).toHaveURL(/\/new-request\/issue-summary/);
});

test('verification gate shows the blocking reason beside the continue buttons', async ({
  page,
}) => {
  await useCustomerFixture(page, 'pending');
  await page.goto('/new-request/create');

  await page.getByText('Continue without AI', { exact: true }).click();
  await expect(page.getByText(/identity verification is pending admin review/i)).toBeVisible();
  await expect(page).toHaveURL(/\/new-request\/create/);
});

test('profile saved-address entry opens address management', async ({ page }) => {
  await useCustomerFixture(page);
  await page.goto('/profile');

  await page.getByText('Saved Addresses', { exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/addresses/);
  await expect(page.getByText('Save an address once', { exact: false })).toBeVisible();
});

test('customer can save a manual address from profile settings', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({
    latitude: geocodedAddress.latitude,
    longitude: geocodedAddress.longitude,
  });
  await useCustomerFixture(page);
  let savedRows: any[] = [];
  await page.unroute('**/rest/v1/addresses*');
  await page.route('**/rest/v1/addresses*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(savedRows),
    }),
  );
  await page.route('**/rest/v1/rpc/upsert_my_address', async (route) => {
    const body = route.request().postDataJSON();
    const saved = {
      id: '33333333-3333-4333-8333-333333333333',
      label: body.p_label,
      line1: body.p_line1,
      line2: body.p_line2,
      barangay: body.p_barangay,
      city: body.p_city,
      province: body.p_province,
      postal_code: body.p_postal_code,
      latitude: body.p_latitude,
      longitude: body.p_longitude,
      is_default: true,
      geocoding_provider: 'MANUAL',
      geocoding_provider_id: null,
      geocoding_confidence: null,
      geocoding_payload: {},
    };
    savedRows = [saved];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(saved),
    });
  });

  await page.goto('/settings/addresses');
  await page.getByRole('button', { name: 'Add Address' }).click();
  await page.getByLabel('Street address').fill('123 Test Street');
  await page.getByLabel('Barangay').fill('Poblacion');
  await page.getByLabel('City or municipality').fill('Makati');
  await page.getByLabel('Province').fill('Metro Manila');
  await page.getByRole('button', { name: 'Use current location' }).click();
  await expect(page.getByText('✓ Location Verified', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save Address' }).click();

  await expect(page.getByText('Home', { exact: true })).toBeVisible();
  await expect(page.getByText('Default', { exact: true })).toBeVisible();
  await expect(page.getByText(/123 Test Street/)).toBeVisible();
});

test('default saved address is selected automatically for a new booking', async ({ page }) => {
  await useCustomerFixture(page);
  await page.unroute('**/rest/v1/addresses*');
  await page.route('**/rest/v1/addresses*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '33333333-3333-4333-8333-333333333333',
          label: 'Home',
          line1: '123 Test Street',
          line2: 'Test Subdivision',
          barangay: 'Poblacion',
          city: 'Makati',
          province: 'Metro Manila',
          postal_code: '1210',
          latitude: geocodedAddress.latitude,
          longitude: geocodedAddress.longitude,
          is_default: true,
          geocoding_provider: 'MANUAL',
          geocoding_provider_id: null,
          geocoding_confidence: null,
          geocoding_payload: {},
        },
      ]),
    }),
  );

  await page.goto('/new-request/create');
  await expect(page.getByPlaceholder('Enter complete address')).toHaveValue(
    '123 Test Street, Test Subdivision, Poblacion, Makati, Metro Manila, 1210',
  );
  await expect(page.getByRole('radio', { name: 'Use saved address Home' })).toBeChecked();
  await expect(page.getByText('✓ Location Verified', { exact: true })).toBeVisible();
});

test('photo analysis waits for consent then merges an editable explanation', async ({ page }) => {
  await useCustomerFixture(page);
  await page.route('**/storage/v1/object/request-media/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ Key: 'request-media/test/photo.png' }),
    }),
  );
  await page.route('**/functions/v1/ai-assist-media', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          analysisId: '22222222-2222-4222-8222-222222222222',
          inputType: 'IMAGE',
          transcript: '',
          problemDescription: 'The photo appears to show a leaking pipe connection.',
          requestDraft: 'Inspect and repair the leaking pipe connection.',
          safetyAdvice: [],
          provider: 'GEMINI',
          model: 'test-model',
          retryable: false,
        },
      }),
    }),
  );
  await page.goto('/new-request/create');

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByText('Take Photo', { exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(join(process.cwd(), 'apps/mobile/assets/images/icon.png'));

  await expect(page.getByText(/Accept AI consent to analyze this photo/i)).toBeVisible();
  await page.getByRole('checkbox').click();
  await expect(page.getByText(/Photo explanation added to the description/i)).toBeVisible();
  await expect(page.getByPlaceholder('e.g. The sink is leaking under the cabinet...')).toHaveValue(
    /leaking pipe connection/i,
  );
});

for (const viewport of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
] as const) {
  test(`service expansion controls fit the ${viewport.name} layout`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await useCustomerFixture(page);

    await page.goto('/home');
    await expect(page.getByRole('button', { name: 'See more service categories' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(1);

    await page.goto('/new-request/create');
    await expect(page.getByRole('button', { name: 'See more services' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(1);
  });
}
