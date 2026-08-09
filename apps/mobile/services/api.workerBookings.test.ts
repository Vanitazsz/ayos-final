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
  randomUUID: () => 'test-channel-id',
}));

vi.mock('@/services/authenticatedFunctions', () => ({
  invokeAuthenticatedFunction: vi.fn(),
  SessionExpiredError: class SessionExpiredError extends Error {},
}));

vi.mock('@/services/profile', () => ({
  getMyProfile: vi.fn(),
  requireIdentity: (value: unknown, label: string) => {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`${label} is unavailable`);
    }
    return value;
  },
  resolveProfileAvatar: async (path: string | null) => path ?? '',
  resolveStorageImage: async (path: string | null) => path ?? '',
  batchResolveAvatars: async (paths: (string | null)[]) => {
    const map = new Map<string, string>();
    for (const p of paths) if (p) map.set(p, p);
    return map;
  },
}));

const query = (result: unknown) => {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockResolvedValue(result);
  return builder;
};

describe('fetchWorkerBookings', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'worker-id' } },
      error: null,
    });
  });

  it('loads direct worker bookings without offer/quote joins', async () => {
    const bookingQuery = query({
      data: [
        {
          id: 'booking-id',
          service_request_id: 'request-id',
          status: 'PENDING',
          created_at: '2026-07-28T00:00:00.000Z',
          agreed_service_amount: 1850,
          service_requests: {
            scheduled_at: '2026-07-29T01:00:00.000Z',
            addresses: {
              line1: '123 Test Street',
              barangay: 'Test Barangay',
              city: 'Test City',
            },
            service_categories: { name: 'Plumbing Repair' },
          },
          user_profiles: {
            display_name: 'Test Customer',
            avatar_path: null,
          },
        },
      ],
      error: null,
    });
    mocks.from.mockImplementation(() => bookingQuery);
    const { fetchWorkerBookings } = await import('./api');

    const result = await fetchWorkerBookings();

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'booking-id',
        requestId: 'request-id',
        recordType: 'booking',
        customerName: 'Test Customer',
        service: 'Plumbing Repair',
        price: '₱1,850.00',
        status: 'pending',
      }),
    ]);
  });
});

describe('selectWorker', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns the direct booking created by the selection RPC', async () => {
    mocks.rpc.mockResolvedValue({
      data: { id: 'booking-id', service_request_id: 'request-id' },
      error: null,
    });
    const { selectWorker } = await import('./api');

    await expect(selectWorker('request-id', 'worker-id')).resolves.toEqual(
      expect.objectContaining({ id: 'booking-id' }),
    );
    expect(mocks.rpc).toHaveBeenCalledWith('select_worker', {
      p_service_request_id: 'request-id',
      p_worker_id: 'worker-id',
    });
  });

  it('rejects an invalid booking response instead of navigating without an id', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    const { selectWorker } = await import('./api');

    await expect(selectWorker('request-id', 'worker-id')).rejects.toThrow(
      'BOOKING_RESPONSE_INVALID',
    );
  });

  it('preserves RPC failures for the matching screen to display', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'WORKER_UNAVAILABLE' },
    });
    const { selectWorker } = await import('./api');

    await expect(selectWorker('request-id', 'worker-id')).rejects.toEqual(
      expect.objectContaining({
        code: 'P0001',
        message: 'WORKER_UNAVAILABLE',
      }),
    );
  });
});

describe('booking completion', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({
      data: { id: 'booking-id', status: 'PENDING_CONFIRMATION', version: 8 },
      error: null,
    });
  });

  it('submits worker completion for customer confirmation', async () => {
    const { completeJob } = await import('./api');

    await completeJob('booking-id');

    expect(mocks.rpc).toHaveBeenCalledWith('transition_booking', {
      p_booking_id: 'booking-id',
      p_target_status: 'PENDING_CONFIRMATION',
      p_expected_version: null,
      p_reason: null,
    });
  });

  it('lets the customer confirm a pending completion', async () => {
    const api = await import('./api');

    await api.confirmJobCompletion('booking-id');

    expect(mocks.rpc).toHaveBeenCalledWith('transition_booking', {
      p_booking_id: 'booking-id',
      p_target_status: 'COMPLETED',
      p_expected_version: null,
      p_reason: null,
    });
  });

  it('resolves the transition result with a single RPC and no version pre-read', async () => {
    const { completeJob } = await import('./api');

    await expect(completeJob('booking-id')).resolves.toEqual({
      data: { id: 'booking-id', status: 'PENDING_CONFIRMATION', version: 8 },
    });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it('surfaces RPC failures to the caller without retrying', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'INVALID_BOOKING_TRANSITION' },
    });
    const { completeJob } = await import('./api');

    await expect(completeJob('booking-id')).rejects.toEqual(
      expect.objectContaining({
        code: 'P0001',
        message: 'INVALID_BOOKING_TRANSITION',
      }),
    );
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});

describe('customer tracking actions', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('calls the customer arrival RPC without optimistic state changes', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: { success: true, status: 'WORKER_ARRIVED' },
      error: null,
    });
    const { confirmCustomerArrival } = await import('./api');

    await expect(confirmCustomerArrival('booking-id')).resolves.toEqual({
      success: true,
      status: 'WORKER_ARRIVED',
    });
    expect(mocks.rpc).toHaveBeenCalledWith('confirm_customer_arrival', {
      p_booking_id: 'booking-id',
    });
  });

  it('preserves server denial for customer completion', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'P0001', message: 'CUSTOMER_COMPLETION_NOT_AVAILABLE' },
    });
    const { confirmCustomerCompletion } = await import('./api');

    await expect(confirmCustomerCompletion('booking-id')).rejects.toEqual(
      expect.objectContaining({ message: 'CUSTOMER_COMPLETION_NOT_AVAILABLE' }),
    );
  });
});
