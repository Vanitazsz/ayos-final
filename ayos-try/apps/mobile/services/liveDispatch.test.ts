import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestPermission: vi.fn(),
  getCurrentPosition: vi.fn(),
  getLastKnownPosition: vi.fn(),
  watchPosition: vi.fn(),
  removeWatch: vi.fn(),
  removeAppState: vi.fn(),
  appStateListeners: [] as Array<(state: string) => void>,
  rpc: vi.fn(),
  readiness: vi.fn(),
}));

vi.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: mocks.requestPermission,
  getCurrentPositionAsync: mocks.getCurrentPosition,
  getLastKnownPositionAsync: mocks.getLastKnownPosition,
  watchPositionAsync: mocks.watchPosition,
}));
vi.mock('react-native', () => ({
  AppState: {
    addEventListener: vi.fn((_event: string, listener: (state: string) => void) => {
      mocks.appStateListeners.push(listener);
      return { remove: mocks.removeAppState };
    }),
  },
}));
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: mocks.rpc },
}));
vi.mock('@/services/workerMatching', () => ({
  getWorkerMatchingReadiness: mocks.readiness,
}));

import {
  normalizeSupabaseError,
  sanitizeAccuracy,
  startForegroundWorkerPresence,
} from './liveDispatch';

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

describe('startForegroundWorkerPresence', () => {
  it('refreshes a stationary worker every ten seconds', async () => {
    vi.useFakeTimers();
    const position = {
      coords: {
        latitude: 14.4179,
        longitude: 120.9795,
        accuracy: 25,
      },
      timestamp: Date.now(),
    };
    mocks.readiness.mockResolvedValue({ matchable: true });
    mocks.requestPermission.mockResolvedValue({ status: 'granted' });
    mocks.getCurrentPosition.mockResolvedValue(position);
    mocks.getLastKnownPosition.mockResolvedValue(position);
    mocks.watchPosition.mockResolvedValue({ remove: mocks.removeWatch });
    mocks.rpc.mockResolvedValue({
      data: { online: true, lastSeenAt: new Date().toISOString() },
      error: null,
    });

    const cleanup = await startForegroundWorkerPresence(vi.fn());
    expect(mocks.rpc).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10000);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);

    cleanup();
    vi.useRealTimers();
  });

  it('keeps the worker online during a short tab switch', async () => {
    vi.useFakeTimers();
    mocks.appStateListeners.length = 0;
    mocks.rpc.mockClear();
    const position = {
      coords: {
        latitude: 14.4179,
        longitude: 120.9795,
        accuracy: 25,
      },
      timestamp: Date.now(),
    };
    mocks.readiness.mockResolvedValue({ matchable: true });
    mocks.requestPermission.mockResolvedValue({ status: 'granted' });
    mocks.getCurrentPosition.mockResolvedValue(position);
    mocks.getLastKnownPosition.mockResolvedValue(position);
    mocks.watchPosition.mockResolvedValue({ remove: mocks.removeWatch });
    mocks.rpc.mockResolvedValue({
      data: { online: true, lastSeenAt: new Date().toISOString() },
      error: null,
    });

    const stateChanged = vi.fn();
    const cleanup = await startForegroundWorkerPresence(stateChanged);
    mocks.appStateListeners.at(-1)?.('background');
    await vi.advanceTimersByTimeAsync(30000);

    expect(
      mocks.rpc.mock.calls.some(([, args]) => args?.p_online === false),
    ).toBe(false);

    mocks.appStateListeners.at(-1)?.('active');
    await vi.advanceTimersByTimeAsync(1);
    expect(stateChanged).toHaveBeenCalledWith('starting');

    cleanup();
    vi.useRealTimers();
  });
});
