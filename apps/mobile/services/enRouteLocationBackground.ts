import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export const EN_ROUTE_BACKGROUND_TASK_NAME = 'ayos-en-route-location';
export const EN_ROUTE_BACKGROUND_INTERVAL_MS = 15_000;
export const EN_ROUTE_BACKGROUND_MIN_MOVEMENT_METERS = 20;

const ACTIVE_TRACKING_BOOKING_KEY = 'ayos.active-tracking-booking-id';

type EnRouteLocationTaskBody = TaskManager.TaskManagerTaskBody<{
  locations?: Location.LocationObject[];
}>;

async function readActiveTrackingBookingId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_TRACKING_BOOKING_KEY);
  } catch {
    return null;
  }
}

export async function startEnRouteBackgroundPublisher(
  bookingId: string,
): Promise<void> {
  if (Platform.OS === 'web') return;
  const current = await Location.getBackgroundPermissionsAsync().catch(
    () => null,
  );
  if (!current || current.status !== 'granted') {
    const permission = await Location.requestBackgroundPermissionsAsync().catch(
      () => null,
    );
    if (!permission || permission.status !== 'granted') {
      await AsyncStorage.removeItem(ACTIVE_TRACKING_BOOKING_KEY).catch(
        () => {},
      );
      return;
    }
  }
  await AsyncStorage.setItem(ACTIVE_TRACKING_BOOKING_KEY, bookingId).catch(
    () => {},
  );
  try {
    const started =
      await Location.hasStartedLocationUpdatesAsync(EN_ROUTE_BACKGROUND_TASK_NAME);
    if (!started) {
      await Location.startLocationUpdatesAsync(EN_ROUTE_BACKGROUND_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: EN_ROUTE_BACKGROUND_INTERVAL_MS,
        distanceInterval: EN_ROUTE_BACKGROUND_MIN_MOVEMENT_METERS,
        showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.OtherNavigation,
        pausesUpdatesAutomatically: false,
        foregroundService: {
          notificationTitle: 'A-YOS is sharing your live location',
          notificationBody: 'Your customer can see your current position.',
        },
      });
    }
  } catch {
    await AsyncStorage.removeItem(ACTIVE_TRACKING_BOOKING_KEY).catch(() => {});
  }
}

let backgroundStartInFlight: Promise<void> | null = null;

export function startEnRouteBackgroundPublisherOnce(
  bookingId: string,
): Promise<void> {
  if (backgroundStartInFlight) return backgroundStartInFlight;
  backgroundStartInFlight = startEnRouteBackgroundPublisher(bookingId).finally(
    () => {
      backgroundStartInFlight = null;
    },
  );
  return backgroundStartInFlight;
}

export async function stopEnRouteBackgroundPublisher(): Promise<void> {
  if (Platform.OS === 'web') return;
  await AsyncStorage.removeItem(ACTIVE_TRACKING_BOOKING_KEY).catch(() => {});
  try {
    const started =
      await Location.hasStartedLocationUpdatesAsync(EN_ROUTE_BACKGROUND_TASK_NAME);
    if (started) {
      await Location.stopLocationUpdatesAsync(EN_ROUTE_BACKGROUND_TASK_NAME);
    }
  } catch {
    // Best-effort stop; the OS resumes foreground-only behavior.
  }
}

async function handleEnRouteBackgroundTask(
  body: EnRouteLocationTaskBody,
): Promise<void> {
  const { data, error } = body;
  const location = data?.locations?.[0];
  if (error || !location) return;
  const bookingId = await readActiveTrackingBookingId();
  if (!bookingId) {
    await stopEnRouteBackgroundPublisher();
    return;
  }
  try {
    const { error: authError } = await supabase.auth.getUser();
    if (authError) return;
    const { error: rpcError } = await supabase.rpc('record_worker_location', {
      booking_id: bookingId,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
    if (rpcError && rpcError.code === '42501') {
      await stopEnRouteBackgroundPublisher();
    }
  } catch {
    // Transient failure; the OS invokes the task again on the next update.
  }
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask(
    EN_ROUTE_BACKGROUND_TASK_NAME,
    handleEnRouteBackgroundTask,
  );
}
