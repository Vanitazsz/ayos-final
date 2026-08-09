import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  channelSend: vi.fn(),
  channelSubscribe: vi.fn(),
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
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test' } },
        error: null,
      }),
    },
    rpc: mocks.rpc,
    channel: vi.fn(() => ({
      subscribe: mocks.channelSubscribe,
      send: mocks.channelSend,
      on: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/services/workerMatching', () => ({
  getWorkerMatchingReadiness: mocks.readiness,
}));

vi.mock('@/lib/crypto', () => ({
  randomUUID: () => 'test-uuid',
}));

import {
  distanceBetweenLocationsMeters,
  EN_ROUTE_LOCATION_INTERVAL_MS,
  MIN_LOCATION_MOVEMENT_METERS,
  normalizeSupabaseError,
  sanitizeAccuracy,
  shouldPublishLocation,
  startEnRouteLocationPublisher,
  startForegroundWorkerPresence,
  stopEnRouteLocationPublisher,
} from './liveDispatch';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.channelSubscribe.mockResolvedValue(undefined);
});

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

describe('location write control', () => {
  const origin = {
    coords: {
      latitude: 14.4179,
      longitude: 120.9795,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: 1,
  };

  it('skips a movement update below twenty meters', () => {
    const nearby = {
      ...origin,
      coords: {
        ...origin.coords,
        latitude: 14.41795,
      },
      timestamp: 2,
    };

    expect(distanceBetweenLocationsMeters(origin, nearby)).toBeLessThan(20);
    expect(shouldPublishLocation(origin, nearby)).toBe(false);
  });

  it('publishes a heartbeat even when the worker is stationary', () => {
    expect(shouldPublishLocation(origin, origin, true)).toBe(true);
  });
});

describe('startForegroundWorkerPresence', () => {
  it('refreshes available-worker presence every thirty seconds', async () => {
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

    await vi.advanceTimersByTimeAsync(29999);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
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

  it('starts watchPosition and cleans up when stopped', async () => {
    mocks.requestPermission.mockResolvedValue({ status: 'granted' });
    mocks.watchPosition.mockResolvedValue({ remove: mocks.removeWatch });

    const stop = await startEnRouteLocationPublisher('test-booking-123');
    expect(mocks.requestPermission).toHaveBeenCalled();
    expect(mocks.watchPosition).toHaveBeenCalledWith(
      expect.objectContaining({
        timeInterval: EN_ROUTE_LOCATION_INTERVAL_MS,
        distanceInterval: MIN_LOCATION_MOVEMENT_METERS,
      }),
      expect.any(Function),
    );

    stop();
    expect(mocks.removeWatch).toHaveBeenCalled();
  });

  it('persists accepted coordinates and still broadcasts the live update', async () => {
    const position = {
      coords: {
        latitude: 14.4179,
        longitude: 120.9795,
        accuracy: 12,
        heading: 90,
        speed: 4,
      },
      timestamp: 123,
    };
    let listener: ((value: typeof position) => void) | undefined;
    mocks.requestPermission.mockResolvedValue({ status: 'granted' });
    mocks.rpc.mockResolvedValue({ data: { id: 'location-1' }, error: null });
    mocks.watchPosition.mockImplementation(async (_options, next) => {
      listener = next;
      return { remove: mocks.removeWatch };
    });

    const stop = await startEnRouteLocationPublisher('test-booking-123');
    listener?.(position);
    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.rpc).toHaveBeenCalledWith('record_worker_location', {
      booking_id: 'test-booking-123',
      latitude: 14.4179,
      longitude: 120.9795,
    });
    expect(mocks.channelSend).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'location-update',
      payload: expect.objectContaining({
        bookingId: 'test-booking-123',
        latitude: 14.4179,
        longitude: 120.9795,
      }),
    });
    stop();
  });

  it('surfaces persistence failure while retaining the broadcast', async () => {
    const position = {
      coords: {
        latitude: 14.4179,
        longitude: 120.9795,
        accuracy: 12,
        heading: null,
        speed: null,
      },
      timestamp: 123,
    };
    let listener: ((value: typeof position) => void) | undefined;
    const onError = vi.fn();
    const onState = vi.fn();
    mocks.requestPermission.mockResolvedValue({ status: 'granted' });
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: 'LOCATION_WRITE_FAILED', code: 'P0001' },
    });
    mocks.watchPosition.mockImplementation(async (_options, next) => {
      listener = next;
      return { remove: mocks.removeWatch };
    });

    const stop = await startEnRouteLocationPublisher('test-booking-123', {
      onError,
      onState,
    });
    listener?.(position);
    await Promise.resolve();
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith('LOCATION_WRITE_FAILED');
    expect(onState).toHaveBeenCalledWith('error', 'LOCATION_WRITE_FAILED');
    expect(mocks.channelSend).toHaveBeenCalled();
    stop();
  });

  it('reports foreground permission denial without starting a watcher', async () => {
    const onError = vi.fn();
    const onState = vi.fn();
    mocks.requestPermission.mockResolvedValue({ status: 'denied' });

    const stop = await startEnRouteLocationPublisher('test-booking-123', {
      onError,
      onState,
    });

    expect(mocks.watchPosition).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      'Location permission is required to share your route with the customer.',
    );
    expect(onState).toHaveBeenCalledWith(
      'permission_denied',
      'Location permission is required to share your route with the customer.',
    );
    stop();
  });

  it('surfaces channel startup failures to the worker', async () => {
    const onError = vi.fn();
    const onState = vi.fn();
    mocks.channelSubscribe.mockRejectedValueOnce(new Error('CHANNEL_FAILED'));

    const stop = await startEnRouteLocationPublisher('test-booking-123', {
      onError,
      onState,
    });

    expect(onError).toHaveBeenCalledWith('CHANNEL_FAILED');
    expect(onState).toHaveBeenCalledWith('error', 'CHANNEL_FAILED');
    stop();
  });

  it('surfaces watcher startup failures to the worker', async () => {
    const onError = vi.fn();
    const onState = vi.fn();
    mocks.requestPermission.mockResolvedValue({ status: 'granted' });
    mocks.watchPosition.mockRejectedValueOnce(new Error('WATCH_FAILED'));

    const stop = await startEnRouteLocationPublisher('test-booking-123', {
      onError,
      onState,
    });

    expect(onError).toHaveBeenCalledWith('WATCH_FAILED');
    expect(onState).toHaveBeenCalledWith('error', 'WATCH_FAILED');
    stop();
  });
});
