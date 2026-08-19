import { describe, expect, it } from 'vitest';
import { resolveWorkerEarningsAmount } from './bookingPayment';

describe('resolveWorkerEarningsAmount', () => {
  it('uses agreed service amount as the canonical source of truth when available', () => {
    expect(
      resolveWorkerEarningsAmount(1_000, {
        status: 'SUCCESSFUL',
        service_amount: 9_999_999_999.99,
      }),
    ).toBe(1_000);
  });

  it('filters out dummy placeholder values >= 999,999,999', () => {
    expect(
      resolveWorkerEarningsAmount(1_000, {
        status: 'SUCCESSFUL',
        service_amount: 999_999_999_999,
      }),
    ).toBe(1_000);
  });

  it('falls back to payment service_amount when agreed amount is unavailable', () => {
    expect(
      resolveWorkerEarningsAmount(null, {
        status: 'AWAITING_CONFIRMATIONS',
        service_amount: 500,
      }),
    ).toBe(500);
  });

  it('returns the agreed amount when payment service_amount is null', () => {
    expect(
      resolveWorkerEarningsAmount(5_000, {
        status: 'SUCCESSFUL',
        service_amount: null,
      }),
    ).toBe(5_000);
  });
});
