import { describe, expect, it } from 'vitest';
import { shouldLoadBookingProofPhotos } from './bookingTracking';

describe('shouldLoadBookingProofPhotos', () => {
  it('allows proof photos only after the worker submits completion', () => {
    expect(shouldLoadBookingProofPhotos('PENDING_CONFIRMATION')).toBe(true);
    expect(shouldLoadBookingProofPhotos('COMPLETED')).toBe(true);
  });

  it('does not expose proof photos during earlier booking states', () => {
    expect(shouldLoadBookingProofPhotos('IN_PROGRESS')).toBe(false);
    expect(shouldLoadBookingProofPhotos('WORKER_EN_ROUTE')).toBe(false);
    expect(shouldLoadBookingProofPhotos(undefined)).toBe(false);
  });
});
