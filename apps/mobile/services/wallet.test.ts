import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PLATFORM_COMMISSION_RATE } from './wallet';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

vi.mock('@/lib/crypto', () => ({
  randomUUID: () => 'mock-uuid-1234',
}));

describe('Wallet Top-Up and Commission Demonstration Logic', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'worker-account-id' } },
      error: null,
    });
  });

  it('defines PLATFORM_COMMISSION_RATE as 0.10 (10%)', () => {
    expect(PLATFORM_COMMISSION_RATE).toBe(0.10);
  });

  it('simulates wallet top-up and increases balance', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: {
        previousBalance: 100,
        newBalance: 600,
        amount: 500,
        status: 'Successful',
        transactionId: 'tx-123',
      },
      error: null,
    });

    const { simulateTopUp } = await import('./wallet');
    const result = await simulateTopUp(500);

    expect(result).toEqual({
      previousBalance: 100,
      newBalance: 600,
      amount: 500,
      status: 'Successful',
      transactionId: 'tx-123',
    });
    expect(mocks.rpc).toHaveBeenCalledWith('simulate_wallet_topup', {
      p_amount: 500,
    });
  });

  it('deducts 10% platform commission on booking payment confirmation', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: {
        bookingId: 'booking-789',
        commissionAmount: 100,
        paymentMethod: 'CASH',
        previousBalance: 600,
        newBalance: 500,
        status: 'COMPLETED',
      },
      error: null,
    });

    const { confirmPaymentWithCommission } = await import('./payments');
    const result = await confirmPaymentWithCommission('booking-789', 'CASH');

    expect(result).toEqual(
      expect.objectContaining({
        bookingId: 'booking-789',
        commissionAmount: 100,
        paymentMethod: 'CASH',
        newBalance: 500,
      }),
    );
    expect(mocks.rpc).toHaveBeenCalledWith('deduct_booking_commission', {
      p_booking_id: 'booking-789',
      p_payment_method: 'CASH',
    });
  });
});
