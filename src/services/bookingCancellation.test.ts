import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

function mockBookingStatus(status: string) {
  const single = vi.fn().mockResolvedValue({ data: { status }, error: null });
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  mocks.from.mockReturnValue({ select });
}

describe('booking cancellation service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps every cancellable booking status to the RPC stage', async () => {
    const { cancellationStageForStatus } = await import('./bookingCancellation');

    expect(cancellationStageForStatus('PENDING')).toBe('BEFORE_ACCEPTANCE');
    expect(cancellationStageForStatus('ACCEPTED')).toBe('BEFORE_TRAVEL');
    expect(cancellationStageForStatus('WORKER_PREPARING')).toBe('BEFORE_TRAVEL');
    expect(cancellationStageForStatus('WORKER_EN_ROUTE')).toBe('EN_ROUTE');
    expect(cancellationStageForStatus('WORKER_ARRIVED')).toBe('ARRIVED');
    expect(cancellationStageForStatus('SERVICE_STARTED')).toBe('SERVICE_STARTED');
    expect(cancellationStageForStatus('IN_PROGRESS')).toBe('IN_PROGRESS');
    expect(cancellationStageForStatus('UNKNOWN')).toBe('BEFORE_ACCEPTANCE');
  });

  it('submits a homeowner reason code, details, stage, and policy version', async () => {
    mockBookingStatus('ACCEPTED');
    mocks.rpc.mockResolvedValueOnce({ data: { id: 'booking-1' }, error: null });

    const { cancelCustomerBooking } = await import('./bookingCancellation');
    await cancelCustomerBooking(
      'booking-1',
      'SCHEDULE_CHANGED',
      'Schedule changed',
      '2026-07-23',
    );

    expect(mocks.rpc).toHaveBeenCalledWith('cancel_booking', {
      p_booking_id: 'booking-1',
      p_expected_version: null,
      p_stage: 'BEFORE_TRAVEL',
      p_reason_code: 'SCHEDULE_CHANGED',
      p_details: 'Schedule changed',
      p_policy_version: '2026-07-23',
    });
  });

  it('keeps the existing worker cancellation defaults unchanged', async () => {
    mockBookingStatus('PENDING');
    mocks.rpc.mockResolvedValueOnce({ data: { id: 'booking-1' }, error: null });

    const { cancelWorkerBooking } = await import('./bookingCancellation');
    await cancelWorkerBooking('booking-1', 'Worker declined the assigned booking');

    expect(mocks.rpc).toHaveBeenCalledWith('cancel_booking', {
      p_booking_id: 'booking-1',
      p_expected_version: null,
      p_stage: 'BEFORE_ACCEPTANCE',
      p_reason_code: 'DECLINED',
      p_details: 'Worker declined the assigned booking',
      p_policy_version: '2026-07-21',
    });
  });
});
