import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mocks.from },
}));

describe('fetchReviewForBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('looks up only the review identifier for a booking', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'review-1' }, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.from.mockReturnValue({ select });

    const { fetchReviewForBooking } = await import('./reviewQueries');
    await expect(fetchReviewForBooking('booking-1')).resolves.toEqual({ id: 'review-1' });
    expect(mocks.from).toHaveBeenCalledWith('reviews');
    expect(select).toHaveBeenCalledWith('id');
    expect(eq).toHaveBeenCalledWith('booking_id', 'booking-1');
    expect(maybeSingle).toHaveBeenCalledOnce();
  });

  it('fails closed when the review lookup fails', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'read failed' } });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.from.mockReturnValue({ select });

    const { fetchReviewForBooking } = await import('./reviewQueries');
    await expect(fetchReviewForBooking('booking-1')).rejects.toThrow('read failed');
  });
});
