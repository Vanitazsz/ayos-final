import { describe, expect, it } from 'vitest';
import {
  queryKeys,
  QUERY_STALE_TIMES,
  toQueryData,
} from '@/services/queryUtils';

describe('toQueryData', () => {
  it('returns data when the response has no error', () => {
    expect(toQueryData({ data: [1, 2, 3] })).toEqual([1, 2, 3]);
    expect(toQueryData({ data: { name: 'a' } })).toEqual({ name: 'a' });
  });

  it('throws the response error when present', () => {
    expect(() => toQueryData({ data: [], error: 'boom' })).toThrow('boom');
  });
});

describe('QUERY_STALE_TIMES', () => {
  it('applies the expected staleness buckets', () => {
    expect(QUERY_STALE_TIMES.catalog).toBe(5 * 60 * 1000);
    expect(QUERY_STALE_TIMES.profile).toBe(5 * 60 * 1000);
    expect(QUERY_STALE_TIMES.list).toBe(30 * 1000);
    expect(QUERY_STALE_TIMES.live).toBe(0);
  });
});

describe('queryKeys', () => {
  it('scopes user-owned keys by userId to prevent cross-user leakage', () => {
    expect(queryKeys.customerProfile('user-1')).toEqual([
      'customer',
      'profile',
      'user-1',
    ]);
    expect(queryKeys.workerBookings('user-1')).toEqual([
      'worker',
      'bookings',
      'user-1',
    ]);
    expect(queryKeys.wallet('user-1')).toEqual(['wallet', 'user-1']);
    expect(queryKeys.notifications('user-1')).toEqual([
      'notifications',
      'user-1',
    ]);
    expect(queryKeys.customerProfile('user-2')).not.toEqual(
      queryKeys.customerProfile('user-1'),
    );
  });

  it('keeps catalog and per-booking keys global or scoped by entity', () => {
    expect(queryKeys.catalogCategories).toEqual(['catalog', 'categories']);
    expect(queryKeys.bookingTracking('b-1')).toEqual([
      'booking',
      'tracking',
      'b-1',
    ]);
    expect(queryKeys.bookingTracking('b-2')).not.toEqual(
      queryKeys.bookingTracking('b-1'),
    );
  });
});
