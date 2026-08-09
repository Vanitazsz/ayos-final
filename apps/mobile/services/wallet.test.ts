import { beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('uses the server commission settlement contract on booking payment confirmation', async () => {
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

  it('does not fall back to client-side writes when the legacy simulation is unavailable', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'MANUAL_TOPUP_REQUIRED', code: '0A000' },
    });

    const { simulateTopUp } = await import('./wallet');
    await expect(simulateTopUp(500)).rejects.toThrow('MANUAL_TOPUP_REQUIRED');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('propagates commission RPC errors without client-side writes', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'SERVICE_CATEGORY_NOT_FOUND', code: '22023' },
    });

    const { confirmPaymentWithCommission } = await import('./payments');
    await expect(
      confirmPaymentWithCommission('booking-789', 'CASH'),
    ).rejects.toThrow('SERVICE_CATEGORY_NOT_FOUND');
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
