import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-location', () => ({}));
vi.mock('react-native', () => ({ AppState: { addEventListener: vi.fn() } }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/services/workerMatching', () => ({ getWorkerMatchingReadiness: vi.fn() }));

import { normalizeSupabaseError, sanitizeAccuracy } from './liveDispatch';

describe('normalizeSupabaseError', () => {
  it('preserves PostgREST messages and codes', () => {
    const result = normalizeSupabaseError({
      message: 'WORKERS_OFFLINE',
      code: 'P0001',
      details: 'No fresh presence records',
    }) as Error & { code?: string; details?: string };
    expect(result.message).toBe('WORKERS_OFFLINE');
    expect(result.code).toBe('P0001');
    expect(result.details).toBe('No fresh presence records');
  });

  it('uses a useful fallback for unknown failures', () => {
    expect(normalizeSupabaseError(null, 'Matching unavailable').message).toBe(
      'Matching unavailable',
    );
  });
});

describe('sanitizeAccuracy', () => {
  it('keeps valid browser accuracy values', () => {
    expect(sanitizeAccuracy(12.345)).toBe(12.35);
    expect(sanitizeAccuracy(10000)).toBe(10000);
  });

  it.each([null, undefined, -1, 10000.01, Number.NaN, Number.POSITIVE_INFINITY])(
    'converts unusable accuracy %s to null',
    (value) => {
      expect(sanitizeAccuracy(value)).toBeNull();
    },
  );
});
