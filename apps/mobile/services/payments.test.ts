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

describe('simulateMockGcashPayment service tests', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('calls simulate_gcash_booking_payment with correct RPC parameters and returns validated success response', async () => {
    const bookingId = '98000000-0000-4000-8000-000000000012';
    const mockRef = 'MOCK-GCASH-980000000000';
    const mockPayment = {
      id: 'pay-123',
      booking_id: bookingId,
      method: 'GCASH',
      provider: 'MOCK_GCASH',
      status: 'SUCCESSFUL',
      service_amount: 5000,
      worker_net_amount: 4500,
      commission_amount: 500,
    };

    mocks.rpc.mockResolvedValueOnce({
      data: mockPayment,
      error: null,
    });

    const { simulateMockGcashPayment } = await import('./payments');
    const result = await simulateMockGcashPayment(bookingId, mockRef);

    expect(result).toEqual(mockPayment);
    expect(mocks.rpc).toHaveBeenCalledWith('simulate_gcash_booking_payment', {
      p_booking_id: bookingId,
      p_reference_number: mockRef,
      p_proof_path: null,
    });
  });

  it('forwards the uploaded proof path to the RPC when provided', async () => {
    const bookingId = '98000000-0000-4000-8000-000000000012';
    const mockRef = 'MOCK-GCASH-980000000000';
    const proofPath = '8a9f3c2e-0000-4000-8000-000000000099/abc123.jpg';
    const mockPayment = {
      id: 'pay-123',
      booking_id: bookingId,
      method: 'GCASH',
      provider: 'MOCK_GCASH',
      status: 'SUCCESSFUL',
    };

    mocks.rpc.mockResolvedValueOnce({
      data: mockPayment,
      error: null,
    });

    const { simulateMockGcashPayment } = await import('./payments');
    const result = await simulateMockGcashPayment(bookingId, mockRef, proofPath);

    expect(result).toEqual(mockPayment);
    expect(mocks.rpc).toHaveBeenCalledWith('simulate_gcash_booking_payment', {
      p_booking_id: bookingId,
      p_reference_number: mockRef,
      p_proof_path: proofPath,
    });
  });

  it('propagates server / RPC errors safely', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Booking is not completed', code: '22023' },
    });

    const { simulateMockGcashPayment } = await import('./payments');
    await expect(
      simulateMockGcashPayment('98000000-0000-4000-8000-000000000012', 'MOCK-GCASH-980000000000'),
    ).rejects.toThrow('Booking is not completed');
  });

  it('throws error when RPC returns malformed response (missing or non-SUCCESSFUL status)', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: {
        id: 'pay-123',
        method: 'GCASH',
        provider: 'MOCK_GCASH',
        status: 'PENDING',
      },
      error: null,
    });

    const { simulateMockGcashPayment } = await import('./payments');
    await expect(
      simulateMockGcashPayment('98000000-0000-4000-8000-000000000012', 'MOCK-GCASH-980000000000'),
    ).rejects.toThrow('Invalid GCash simulation response');
  });

  it('throws error when RPC returns invalid provider or method', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: {
        id: 'pay-123',
        method: 'CASH',
        provider: null,
        status: 'SUCCESSFUL',
      },
      error: null,
    });

    const { simulateMockGcashPayment } = await import('./payments');
    await expect(
      simulateMockGcashPayment('98000000-0000-4000-8000-000000000012', 'MOCK-GCASH-980000000000'),
    ).rejects.toThrow('Invalid GCash simulation response');
  });
});
