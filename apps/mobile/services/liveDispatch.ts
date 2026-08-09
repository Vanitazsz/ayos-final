import * as Location from 'expo-location';
import { AppState } from 'react-native';
import { randomUUID } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';
import { getWorkerMatchingReadiness } from '@/services/workerMatching';
import { recordWorkerLocation } from '@/services/bookingLocation';

export const WORKER_PRESENCE_HEARTBEAT_INTERVAL_MS = 30_000;
export const LIVE_DISPATCH_REFRESH_INTERVAL_MS = 60_000;
export const EN_ROUTE_LOCATION_INTERVAL_MS = 5_000;
export const MIN_LOCATION_MOVEMENT_METERS = 20;

export type DispatchStatus =
  | 'OFFERED'
  | 'VIEWED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'SELECTED';
export type LiveWorkerCandidate = {
  dispatchId: string;
  workerId: string;
  status: DispatchStatus;
  name: string;
  avatar: string | null;
  distanceMeters: number;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  rateMinor: number | null;
};
export type DispatchDiagnostics = {
  reasonCode:
    | 'NO_ACTIVE_WORKERS'
    | 'NO_CATEGORY_WORKERS'
    | 'NO_APPROVED_WORKERS'
    | 'WORKERS_MISSING_SERVICE_AREA'
    | 'WORKERS_OFFLINE'
    | 'NO_FRESH_PRESENCE'
    | 'OUTSIDE_SERVICE_RADIUS'
    | 'OUTSIDE_SEARCH_RADIUS'
    | 'WAITING_FOR_RESPONSE';
  counts: {
    active: number;
    skilled: number;
    approved: number;
    available: number;
    freshPresence: number;
    withinWave: number;
    subdivisionCompatible: number;
  };
};
export type DispatchSnapshot = {
  serviceRequestId: string;
  startedAt: string;
  expiresAt: string;
  wave: 1 | 2 | 3;
  searchRadiusMeters: number;
  diagnostics: DispatchDiagnostics;
  candidates: LiveWorkerCandidate[];
};

export type DispatchDiagnosticReason = DispatchDiagnostics['reasonCode'];

export function dispatchDiagnosticMessage(
  diagnostic: DispatchDiagnostics | undefined,
): string {
  switch (diagnostic?.reasonCode) {
    case 'NO_CATEGORY_WORKERS':
      return 'No workers in this service category are available nearby.';
    case 'NO_APPROVED_WORKERS':
      return 'Matching workers still need approval.';
    case 'WORKERS_MISSING_SERVICE_AREA':
      return 'Matching workers have not finished setting their service area.';
    case 'WORKERS_OFFLINE':
    case 'NO_FRESH_PRESENCE':
      return 'Eligible workers are currently offline. Try again later.';
    case 'OUTSIDE_SEARCH_RADIUS':
    case 'OUTSIDE_SERVICE_RADIUS':
      return 'No eligible workers were found within your selected radius.';
    default:
      return '';
  }
}
export type DispatchOffer = {
  dispatchId: string;
  serviceRequestId: string;
  status: DispatchStatus;
  distanceMeters: number;
  expiresAt: string;
  category: string;
  description: string;
  rateMinor: number | null;
  area: string;
  budget?: string;
};
export type PresenceState =
  | 'starting'
  | 'online'
  | 'paused'
  | 'offline'
  | 'permission_denied'
  | 'not_ready'
  | 'error';
export type WorkerLiveStatus = {
  subdivisionId: string | null;
  subdivisionName: string | null;
  serviceArea: string | null;
  radiusMeters: number | null;
  presenceOnline: boolean;
  lastSeenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
};

export function normalizeSupabaseError(
  error: unknown,
  fallback = 'Request failed',
) {
  if (error instanceof Error) return error;
  if (error && typeof error === 'object') {
    const value = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
    };
    const message =
      typeof value.message === 'string' ? value.message : fallback;
    const normalized = new Error(message) as Error & {
      code?: string;
      details?: string;
    };
    if (typeof value.code === 'string') normalized.code = value.code;
    if (typeof value.details === 'string') normalized.details = value.details;
    return normalized;
  }
  return new Error(fallback);
}

async function rpc<T>(name: string, args?: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw normalizeSupabaseError(error);
  return data as T;
}
export const startLiveDispatch = (
  serviceRequestId: string,
  searchRadiusMeters: number,
) =>
  rpc<DispatchSnapshot>('start_live_dispatch', {
    p_service_request_id: serviceRequestId,
    p_search_radius_meters: searchRadiusMeters,
  });
export const getLiveDispatchSnapshot = (serviceRequestId: string) =>
  rpc<DispatchSnapshot>('get_live_dispatch_snapshot', {
    p_service_request_id: serviceRequestId,
  });
export const getMyDispatchOffers = () =>
  rpc<DispatchOffer[]>('get_my_dispatch_offers');
export const getMyWorkerLiveStatus = () =>
  rpc<WorkerLiveStatus>('get_my_worker_live_status');
export const respondToDispatch = (
  dispatchId: string,
  response: 'ACCEPTED' | 'DECLINED',
) =>
  rpc<{ dispatchId: string; status: DispatchStatus }>('respond_to_dispatch', {
    p_dispatch_id: dispatchId,
    p_response: response,
  });

export function subscribeToDispatch(
  onChange: () => void,
  filter?: string,
  onStatus?: (status: string) => void,
) {
  const channel = supabase
    .channel(`live-dispatch:${filter ?? 'mine'}:${randomUUID()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'service_request_dispatches',
        filter,
      },
      onChange,
    )
    .subscribe((status) => onStatus?.(status));
  return () => {
    void supabase.removeChannel(channel);
  };
}

export function sanitizeAccuracy(
  accuracy: number | null | undefined,
): number | null {
  if (accuracy == null || !Number.isFinite(accuracy)) return null;
  if (accuracy < 0 || accuracy > 10000) return null;
  return Math.round(accuracy * 100) / 100;
}

export function distanceBetweenLocationsMeters(
  previous: Location.LocationObject,
  next: Location.LocationObject,
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(
    next.coords.latitude - previous.coords.latitude,
  );
  const longitudeDelta = toRadians(
    next.coords.longitude - previous.coords.longitude,
  );
  const previousLatitude = toRadians(previous.coords.latitude);
  const nextLatitude = toRadians(next.coords.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(previousLatitude) *
      Math.cos(nextLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    2 *
    earthRadiusMeters *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function shouldPublishLocation(
  previous: Location.LocationObject | null,
  next: Location.LocationObject,
  forceHeartbeat = false,
) {
  return (
    forceHeartbeat ||
    previous === null ||
    distanceBetweenLocationsMeters(previous, next) >=
      MIN_LOCATION_MOVEMENT_METERS
  );
}

async function publishWorkerPosition(
  position: Location.LocationObject,
  online = true,
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { online, lastSeenAt: new Date().toISOString() };
  return rpc<{ online: boolean; lastSeenAt: string }>(
    'update_worker_presence',
    {
      p_latitude: position.coords.latitude,
      p_longitude: position.coords.longitude,
      p_accuracy_meters: sanitizeAccuracy(position.coords.accuracy),
      p_online: online,
    },
  );
}

export async function refreshWorkerPresence() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted')
    throw new Error(
      'Location permission is required to receive nearby requests.',
    );
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  await publishWorkerPosition(position, true);
  return getMyWorkerLiveStatus();
}

export async function startForegroundWorkerPresence(
  onState: (state: PresenceState, message?: string) => void,
) {
  const readiness = await getWorkerMatchingReadiness();
  if (!readiness.matchable) {
    onState(
      'not_ready',
      'Complete Service Availability and switch Available for matching on.',
    );
    return () => {};
  }
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    onState(
      'permission_denied',
      'Location permission is required to receive nearby requests.',
    );
    return () => {};
  }
  let stopped = false;
  let active = false;
  let publishing = false;
  let subscription: Location.LocationSubscription | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let backgroundGraceTimer: ReturnType<typeof setTimeout> | null = null;
  let latestPosition: Location.LocationObject | null = null;
  let lastPublishedPosition: Location.LocationObject | null = null;

  const publish = async (
    position: Location.LocationObject,
    online = true,
    forceHeartbeat = false,
  ) => {
    if (publishing) return;
    latestPosition = position;
    if (
      online &&
      !shouldPublishLocation(
        lastPublishedPosition,
        position,
        forceHeartbeat,
      )
    )
      return;
    publishing = true;
    try {
      await publishWorkerPosition(position, online);
      if (online) lastPublishedPosition = position;
      if (!stopped) onState(online ? 'online' : 'offline');
    } catch (error) {
      if (!stopped) onState('error', normalizeSupabaseError(error).message);
    } finally {
      publishing = false;
    }
  };

  const heartbeat = async () => {
    if (stopped || !active || publishing) return;
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!stopped && active) await publish(position, true, true);
    } catch (error) {
      if (!stopped && active)
        onState(
          'error',
          normalizeSupabaseError(
            error,
            'Unable to refresh the browser location.',
          ).message,
        );
    }
  };

  const stopActivePresence = () => {
    active = false;
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    try {
      subscription?.remove?.();
    } catch {}
    subscription = null;
  };

  const begin = async () => {
    if (stopped || active) return;
    if (backgroundGraceTimer) {
      clearTimeout(backgroundGraceTimer);
      backgroundGraceTimer = null;
    }
    active = true;
    onState('starting');
    try {
      await heartbeat();
      if (stopped || !active) return;
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: WORKER_PRESENCE_HEARTBEAT_INTERVAL_MS,
          distanceInterval: 20,
        },
        (position) => {
          latestPosition = position;
          void publish(position, true);
        },
        (message) => {
          if (!stopped && active)
            onState('error', message || 'Browser location updates stopped.');
        },
      );
      heartbeatTimer = setInterval(
        () => void heartbeat(),
        WORKER_PRESENCE_HEARTBEAT_INTERVAL_MS,
      );
    } catch (error) {
      stopActivePresence();
      if (!stopped)
        onState(
          'error',
          normalizeSupabaseError(error, 'Unable to read the browser location.')
            .message,
        );
    }
  };

  const publishOffline = async () => {
    const position =
      latestPosition ?? (await Location.getLastKnownPositionAsync());
    if (position) {
      try {
        await publishWorkerPosition(position, false);
      } catch (error) {
        if (!stopped) onState('error', normalizeSupabaseError(error).message);
      }
    }
  };

  await begin();
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void begin();
      return;
    }
    stopActivePresence();
    onState('paused', 'Tab inactive — matching will pause after 60 seconds.');
    if (!backgroundGraceTimer) {
      backgroundGraceTimer = setTimeout(() => {
        backgroundGraceTimer = null;
        if (!active && !stopped) {
          onState('offline', 'Return to this tab to resume matching.');
          void publishOffline();
        }
      }, 60000);
    }
  });
  const webDocument = typeof document !== 'undefined' ? document : null;
  const onVisibility = () => {
    if (webDocument?.visibilityState === 'visible') void begin();
    else {
      stopActivePresence();
      onState('paused', 'Tab inactive — matching will pause after 60 seconds.');
    }
  };
  const onFocus = () => void begin();
  webDocument?.addEventListener('visibilitychange', onVisibility);
  webDocument?.defaultView?.addEventListener('focus', onFocus);
  return () => {
    stopped = true;
    appState.remove();
    webDocument?.removeEventListener('visibilitychange', onVisibility);
    webDocument?.defaultView?.removeEventListener('focus', onFocus);
    stopActivePresence();
    if (backgroundGraceTimer) {
      clearTimeout(backgroundGraceTimer);
      backgroundGraceTimer = null;
    }
    void publishOffline();
  };
}

export type LiveEnRouteLocation = {
  bookingId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  timestamp: number;
};

export type EnRouteLocationPublisherState =
  | 'starting'
  | 'active'
  | 'permission_denied'
  | 'error';

export type EnRouteLocationPublisherCallbacks = {
  onLocationUpdate?: (loc: LiveEnRouteLocation) => void;
  onError?: (message: string) => void;
  onState?: (state: EnRouteLocationPublisherState, message?: string) => void;
};

let activeEnRouteSubscription: Location.LocationSubscription | null = null;
let activeEnRouteChannel: ReturnType<typeof supabase.channel> | null = null;

export async function startEnRouteLocationPublisher(
  bookingId: string,
  callback?: ((loc: LiveEnRouteLocation) => void) | EnRouteLocationPublisherCallbacks,
) {
  const callbacks: EnRouteLocationPublisherCallbacks =
    typeof callback === 'function' ? { onLocationUpdate: callback } : (callback ?? {});
  callbacks.onState?.('starting');
  stopEnRouteLocationPublisher();
  const channel = supabase.channel(`booking-location:${bookingId}`);
  try {
    await channel.subscribe();
  } catch (error) {
    const message = normalizeSupabaseError(
      error,
      'Live route sharing could not be started.',
    ).message;
    callbacks.onError?.(message);
    callbacks.onState?.('error', message);
    return stopEnRouteLocationPublisher;
  }
  activeEnRouteChannel = channel;

  let permission: { status: string };
  try {
    permission = await Location.requestForegroundPermissionsAsync();
  } catch (error) {
    const message = normalizeSupabaseError(
      error,
      'Location permission could not be checked.',
    ).message;
    callbacks.onError?.(message);
    callbacks.onState?.('error', message);
    stopEnRouteLocationPublisher();
    return stopEnRouteLocationPublisher;
  }
  if (permission.status !== 'granted') {
    const message =
      'Location permission is required to share your route with the customer.';
    callbacks.onError?.(message);
    callbacks.onState?.('permission_denied', message);
    stopEnRouteLocationPublisher();
    return stopEnRouteLocationPublisher;
  }

  try {
    activeEnRouteSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: EN_ROUTE_LOCATION_INTERVAL_MS,
        distanceInterval: MIN_LOCATION_MOVEMENT_METERS,
      },
      (position) => {
        const payload: LiveEnRouteLocation = {
          bookingId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading ?? null,
          speed: position.coords.speed ?? null,
          accuracy: position.coords.accuracy ?? null,
          timestamp: position.timestamp,
        };
        void (async () => {
          try {
            await recordWorkerLocation(
              bookingId,
              payload.latitude,
              payload.longitude,
            );
            callbacks.onState?.('active');
          } catch (error) {
            const persistenceError = normalizeSupabaseError(
              error,
              'Route location could not be saved.',
            ).message;
            callbacks.onError?.(persistenceError);
            callbacks.onState?.('error', persistenceError);
          } finally {
            if (activeEnRouteChannel) {
              void activeEnRouteChannel.send({
                type: 'broadcast',
                event: 'location-update',
                payload,
              });
            }
            callbacks.onLocationUpdate?.(payload);
          }
        })();
      },
    );
  } catch (error) {
    const message = normalizeSupabaseError(
      error,
      'Live route sharing could not be started.',
    ).message;
    callbacks.onError?.(message);
    callbacks.onState?.('error', message);
    stopEnRouteLocationPublisher();
    return stopEnRouteLocationPublisher;
  }

  return stopEnRouteLocationPublisher;
}

export function stopEnRouteLocationPublisher() {
  if (activeEnRouteSubscription) {
    activeEnRouteSubscription.remove();
    activeEnRouteSubscription = null;
  }
  if (activeEnRouteChannel) {
    void supabase.removeChannel(activeEnRouteChannel);
    activeEnRouteChannel = null;
  }
}

export function subscribeToEnRouteLocation(
  bookingId: string,
  onLocationReceived: (loc: LiveEnRouteLocation) => void,
) {
  const channel = supabase.channel(`booking-location:${bookingId}`);
  channel
    .on('broadcast', { event: 'location-update' }, (message) => {
      if (message.payload) {
        onLocationReceived(message.payload as LiveEnRouteLocation);
      }
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
