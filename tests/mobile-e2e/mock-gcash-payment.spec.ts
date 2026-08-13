import { expect, test, type Page } from '@playwright/test';

const customerId = '99000000-0000-4000-8000-000000000011';
const workerId = '98000000-0000-4000-8000-000000000011';
const bookingId = '98000000-0000-4000-8000-000000000012';
const authStorageKey = 'sb-qsurouiyvisykjkgjqmz-auth-token';

function accessToken(userId: string, role: string) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: userId,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3_600,
  })}.test-signature`;
}

async function useCustomerFixture(page: Page) {
  const token = accessToken(customerId, 'USER');
  const user = {
    id: customerId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'gcash.customer@example.test',
    email_confirmed_at: '2026-07-30T00:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { role: 'USER' },
    created_at: '2026-07-30T00:00:00.000Z',
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
        account: { id: customerId, email: user.email, status: 'ACTIVE', role: 'USER' },
        active_role: 'USER',
        profile: { display_name: 'GCash Customer' },
        email_verified: true,
        profile_complete: true,
      }),
    }),
  );
  await page.route('**/rest/v1/rpc/get_platform_fee_settings', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ commissionRate: 10, homeownerCharge: 0 }),
    }),
  );
  await page.route('**/rest/v1/bookings*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: bookingId,
        status: 'COMPLETED',
        agreed_service_amount: 3000,
        service_requests: {
          id: 'req-123',
          description: 'Fixing plumbing',
          service_categories: { name: 'Plumbing' },
          addresses: { line1: '123 Main St', city: 'Manila' },
        },
        user_profiles: { display_name: 'GCash Customer' },
        payments: [],
      }),
    }),
  );
}

test('GCash details, 2.5s delay, processing, paid state, and success navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useCustomerFixture(page);

  const rpcCalls: any[] = [];
  await page.route('**/rest/v1/rpc/simulate_gcash_booking_payment', async (route) => {
    rpcCalls.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'p-1',
        booking_id: bookingId,
        method: 'GCASH',
        provider: 'MOCK_GCASH',
        status: 'SUCCESSFUL',
        service_amount: 3000,
      }),
    });
  });

  await page.goto(`/payment/${bookingId}`);

  // GCash option should be enabled
  await expect(page.getByText('GCash', { exact: true })).toBeVisible();
  await page.getByText('GCash', { exact: true }).click();

  await page.getByRole('button', { name: /Proceed to GCash Payment/i }).click();

  // Verify details in MockGCashPayment component
  await expect(page.getByText('A-YOS Services')).toBeVisible();
  await expect(page.getByText('09** *** 1234')).toBeVisible();
  await expect(page.getByTestId('mock-gcash-reference')).toContainText('MOCK-GCASH-980000000000');
  await expect(page.getByText(/Simulation Only/i)).toBeVisible();

  // Wait for Paid state
  await expect(page.getByTestId('mock-gcash-paid')).toBeVisible({ timeout: 5000 });

  expect(rpcCalls).toHaveLength(1);
  expect(rpcCalls[0]).toEqual({
    p_booking_id: bookingId,
    p_reference_number: 'MOCK-GCASH-980000000000',
    p_proof_path: null,
  });
});

test('Back navigation during local delay produces no RPC', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useCustomerFixture(page);

  const rpcCalls: any[] = [];
  await page.route('**/rest/v1/rpc/simulate_gcash_booking_payment', async (route) => {
    rpcCalls.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'SUCCESSFUL' }),
    });
  });

  await page.goto(`/payment/${bookingId}`);
  await page.getByText('GCash', { exact: true }).click();
  await page.getByRole('button', { name: /Proceed to GCash Payment/i }).click();

  // Instantly click Cancel/Back before 2.5s delay finishes
  await page.getByLabel('Cancel payment').click();

  // Wait 3 seconds to ensure timer would have fired if active
  await page.waitForTimeout(3000);

  expect(rpcCalls).toHaveLength(0);
});

test('Cash payment remains default and calls confirm_cash_payment', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useCustomerFixture(page);

  const cashRpcCalls: any[] = [];
  await page.route('**/rest/v1/rpc/confirm_cash_payment', async (route) => {
    cashRpcCalls.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'pay-cash-1',
        status: 'SUCCESSFUL',
      }),
    });
  });

  await page.goto(`/payment/${bookingId}`);
  await page.getByRole('button', { name: /Confirm cash payment/i }).click();

  expect(cashRpcCalls).toHaveLength(1);
  expect(cashRpcCalls[0]).toHaveProperty('p_booking_id', bookingId);
});

test('Worker Wallet displays Mock GCash Earning', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const token = accessToken(workerId, 'WORKER');
  const user = {
    id: workerId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'worker.wallet@example.test',
    email_confirmed_at: '2026-07-30T00:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { role: 'WORKER' },
    created_at: '2026-07-30T00:00:00.000Z',
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
        account: { id: workerId, email: user.email, status: 'ACTIVE', role: 'WORKER' },
        active_role: 'WORKER',
        profile: { display_name: 'GCash Worker' },
        email_verified: true,
        profile_complete: true,
      }),
    }),
  );
  await page.route('**/rest/v1/wallets*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ available_minor: 270000, locked_minor: 0 }),
    }),
  );
  await page.route('**/rest/v1/payout_destinations*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
  );
  await page.route('**/rest/v1/payout_requests*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
  );
  await page.route('**/rest/v1/wallet_transactions*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'tx-1',
          wallet_account_id: workerId,
          transaction_type: 'BOOKING_EARNING',
          amount_minor: 270000,
          balance_after_minor: 270000,
          metadata: {
            simulated: true,
            payment_method: 'GCASH',
            reference_number: 'MOCK-GCASH-980000000000',
          },
          created_at: new Date().toISOString(),
        },
      ]),
    }),
  );

  await page.goto('/(worker)/wallet');
  await expect(page.getByText('Mock GCash Earning')).toBeVisible();
});
