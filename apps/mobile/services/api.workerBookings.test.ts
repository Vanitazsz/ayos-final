import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
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
