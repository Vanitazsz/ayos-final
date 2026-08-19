import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: mocks.rpc },
}));

describe('manual wallet top-up service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits a worker-owned GCash proof request through the RPC contract', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: {
        id: 'topup-1',
        status: 'PENDING',
        amount_centavos: 25000,
        channel: 'GCASH',
        reference_number: 'GCASH-1234',
        created_at: '2026-08-09T00:00:00.000Z',
      },
      error: null,
    });

    const { submitManualWalletTopup } = await import('./walletTopups');
    await expect(
      submitManualWalletTopup({
        amountCentavos: 25000,
        channel: 'GCASH',
        referenceNumber: 'GCASH-1234',
        proofPath: 'worker-1/proof.png',
        idempotencyKey: 'topup-idempotency-1234',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ id: 'topup-1', status: 'PENDING' }),
    );
    expect(mocks.rpc).toHaveBeenCalledWith('submit_manual_wallet_topup', {
      p_amount_centavos: 25000,
      p_channel: 'GCASH',
      p_reference_number: 'GCASH-1234',
      p_proof_path: 'worker-1/proof.png',
      p_idempotency_key: 'topup-idempotency-1234',
    });
  });

  it('reads owner-scoped approval statuses from the RPC', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [
        {
          id: 'topup-1',
          status: 'SUCCESSFUL',
          amount_centavos: 25000,
          channel: 'GCASH',
          reference_number: 'GCASH-1234',
          created_at: '2026-08-09T00:00:00.000Z',
        },
      ],
      error: null,
    });

    const { fetchMyWalletTopups } = await import('./walletTopups');
    await expect(fetchMyWalletTopups()).resolves.toEqual([
      expect.objectContaining({
        id: 'topup-1',
        status: 'SUCCESSFUL',
        amountCentavos: 25000,
      }),
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith('get_my_wallet_topups');
  });
});
