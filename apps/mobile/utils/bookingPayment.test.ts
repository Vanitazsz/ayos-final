import { describe, expect, it } from 'vitest';
import { resolveWorkerEarningsAmount } from './bookingPayment';

describe('resolveWorkerEarningsAmount', () => {
  it('uses the successful payment amount for completed worker earnings', () => {
    expect(
      resolveWorkerEarningsAmount(5_000, {
        status: 'SUCCESSFUL',
        service_amount: 500,
      }),
    ).toBe(500);
  });

  it('uses the agreed amount until payment is successful', () => {
    expect(
      resolveWorkerEarningsAmount(5_000, {
        status: 'AWAITING_CONFIRMATIONS',
        service_amount: 500,
      }),
    ).toBe(5_000);
  });

  it('falls back to the agreed amount when confirmed payment data is invalid', () => {
    expect(
      resolveWorkerEarningsAmount(5_000, {
        status: 'SUCCESSFUL',
        service_amount: null,
      }),
    ).toBe(5_000);
  });
});
