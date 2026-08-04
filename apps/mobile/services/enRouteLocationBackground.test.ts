import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const storage = new Map<string, string>();
  const taskExecutors: Record<string, (body: unknown) => Promise<void>> = {};
  return {
    storage,
    taskExecutors,
    defineTask: vi.fn((name: string, fn: (body: unknown) => Promise<void>) => {
      taskExecutors[name] = fn;
    }),
    hasStarted: vi.fn(async () => false),
    startUpdates: vi.fn(async () => {}),
    stopUpdates: vi.fn(async () => {}),
    requestBackgroundPermission: vi.fn(),
    getBackgroundPermission: vi.fn(),
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
    getUser: vi.fn(),
    rpc: vi.fn(),
  };
});

vi.mock('expo-task-manager', () => ({
  defineTask: mocks.defineTask,
  isTaskRegisteredAsync: vi.fn(async () => false),
}));

vi.mock('expo-location', () => ({
  Accuracy: { Balanced: 3, High: 5 },
  ActivityType: { OtherNavigation: 5 },
  requestBackgroundPermissionsAsync: mocks.requestBackgroundPermission,
  getBackgroundPermissionsAsync: mocks.getBackgroundPermission,
  hasStartedLocationUpdatesAsync: mocks.hasStarted,
  startLocationUpdatesAsync: mocks.startUpdates,
  stopLocationUpdatesAsync: mocks.stopUpdates,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: mocks.getItem,
    setItem: mocks.setItem,
    removeItem: mocks.removeItem,
  },
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  },
}));

import {
  EN_ROUTE_BACKGROUND_TASK_NAME,
  EN_ROUTE_BACKGROUND_INTERVAL_MS,
  EN_ROUTE_BACKGROUND_MIN_MOVEMENT_METERS,
  startEnRouteBackgroundPublisher,
  startEnRouteBackgroundPublisherOnce,
  stopEnRouteBackgroundPublisher,
} from './enRouteLocationBackground';

const ACTIVE_TRACKING_BOOKING_KEY = 'ayos.active-tracking-booking-id';
const location = {
  coords: {
    latitude: 14.418,
    longitude: 120.98,
    accuracy: 12,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: 1,
};

const locationBody = {
  data: { locations: [location] },
  error: null,
  executionInfo: { taskId: 'task', state: null },
};

const runTask = () => {
  const executor = mocks.taskExecutors[EN_ROUTE_BACKGROUND_TASK_NAME];
  expect(executor).toBeDefined();
  return executor(locationBody);
};

beforeEach(() => {
  mocks.storage.clear();
  mocks.rpc.mockReset();
  mocks.getUser.mockReset();
  mocks.hasStarted.mockResolvedValue(false);
  mocks.startUpdates.mockClear();
  mocks.stopUpdates.mockClear();
  mocks.setItem.mockClear();
  mocks.removeItem.mockClear();
  mocks.requestBackgroundPermission.mockReset();
  mocks.getBackgroundPermission.mockReset();
  mocks.requestBackgroundPermission.mockResolvedValue({ status: 'granted' });
  mocks.getBackgroundPermission.mockResolvedValue({ status: 'undetermined' });
});

describe('enRouteLocationBackground', () => {
  it('registers the background location task', () => {
    expect(mocks.defineTask).toHaveBeenCalledWith(
      EN_ROUTE_BACKGROUND_TASK_NAME,
      expect.any(Function),
    );
  });

  it('persists and clears the active tracking booking id', async () => {
    await startEnRouteBackgroundPublisher('booking-1');
    expect(mocks.storage.get(ACTIVE_TRACKING_BOOKING_KEY)).toBe('booking-1');
    await stopEnRouteBackgroundPublisher();
    expect(mocks.storage.get(ACTIVE_TRACKING_BOOKING_KEY)).toBeUndefined();
  });

  it('starts background updates when permission is granted', async () => {
    mocks.requestBackgroundPermission.mockResolvedValue({ status: 'granted' });
    await startEnRouteBackgroundPublisher('booking-1');
    expect(mocks.startUpdates).toHaveBeenCalledWith(
      EN_ROUTE_BACKGROUND_TASK_NAME,
      expect.objectContaining({
        accuracy: expect.any(Number),
        timeInterval: EN_ROUTE_BACKGROUND_INTERVAL_MS,
        distanceInterval: EN_ROUTE_BACKGROUND_MIN_MOVEMENT_METERS,
        foregroundService: {
          notificationTitle: expect.any(String),
          notificationBody: expect.any(String),
        },
      }),
    );
  });

  it('does not re-start an already running task', async () => {
    mocks.requestBackgroundPermission.mockResolvedValue({ status: 'granted' });
    mocks.hasStarted.mockResolvedValue(true);
    await startEnRouteBackgroundPublisher('booking-1');
    expect(mocks.startUpdates).not.toHaveBeenCalled();
    expect(mocks.storage.get(ACTIVE_TRACKING_BOOKING_KEY)).toBe('booking-1');
  });

  it('falls back to foreground-only when background permission is denied', async () => {
    mocks.requestBackgroundPermission.mockResolvedValue({ status: 'denied' });
    await startEnRouteBackgroundPublisher('booking-1');
    expect(mocks.startUpdates).not.toHaveBeenCalled();
    expect(mocks.storage.get(ACTIVE_TRACKING_BOOKING_KEY)).toBeUndefined();
  });

  it('skips the permission prompt when background permission is already granted', async () => {
    mocks.getBackgroundPermission.mockResolvedValue({ status: 'granted' });
    await startEnRouteBackgroundPublisher('booking-1');
    expect(mocks.requestBackgroundPermission).not.toHaveBeenCalled();
    expect(mocks.startUpdates).toHaveBeenCalledWith(
      EN_ROUTE_BACKGROUND_TASK_NAME,
      expect.anything(),
    );
  });

  it('coalesces concurrent starts into a single permission prompt', async () => {
    const first = startEnRouteBackgroundPublisherOnce('booking-1');
    const second = startEnRouteBackgroundPublisherOnce('booking-1');
    await Promise.all([first, second]);
    expect(mocks.requestBackgroundPermission).toHaveBeenCalledTimes(1);
    expect(mocks.startUpdates).toHaveBeenCalledTimes(1);
  });

  it('publishes a worker location for the active booking', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    mocks.storage.set(ACTIVE_TRACKING_BOOKING_KEY, 'booking-1');
    await runTask();
    expect(mocks.rpc).toHaveBeenCalledWith('record_worker_location', {
      booking_id: 'booking-1',
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
  });

  it('skips publishing when the session cannot be refreshed', async () => {
    mocks.getUser.mockResolvedValue({ data: null, error: new Error('expired') });
    mocks.storage.set(ACTIVE_TRACKING_BOOKING_KEY, 'booking-1');
    await runTask();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('stops the task when the booking is no longer trackable', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'Location update not allowed' },
    });
    mocks.hasStarted.mockResolvedValue(true);
    mocks.storage.set(ACTIVE_TRACKING_BOOKING_KEY, 'booking-1');
    await runTask();
    expect(mocks.stopUpdates).toHaveBeenCalledWith(EN_ROUTE_BACKGROUND_TASK_NAME);
    expect(mocks.storage.get(ACTIVE_TRACKING_BOOKING_KEY)).toBeUndefined();
  });

  it('ignores task errors without publishing', async () => {
    await runTask();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
