import { useEffect, useState } from 'react';
import { calculateRoute, type RouteResult } from '@/services/routing';
import { reverseGeocode } from '@/services/geocoding';

export interface BookingRouteResult {
  route: RouteResult['geojson'] | null;
  etaSeconds: number | null;
  distanceMeters: number | null;
  startAddress: string;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const routeCache = new Map<string, { data: BookingRouteResult; expiresAt: number }>();

function cacheKey(
  bookingId: string | undefined,
  startLat: number,
  startLng: number,
  destinationLat: number,
  destinationLng: number,
): string {
  return [
    bookingId ?? 'route',
    startLat.toFixed(6),
    startLng.toFixed(6),
    destinationLat.toFixed(6),
    destinationLng.toFixed(6),
  ].join(':');
}

export function useBookingRoute(options: {
  startLat?: number | null;
  startLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  bookingId?: string;
}): BookingRouteResult | null {
  const { startLat, startLng, destinationLat, destinationLng, bookingId } =
    options;
  const [result, setResult] = useState<BookingRouteResult | null>(null);

  useEffect(() => {
    if (
      startLat == null ||
      startLng == null ||
      destinationLat == null ||
      destinationLng == null
    ) {
      setResult(null);
      return;
    }
    let active = true;
    const apply = (value: BookingRouteResult) => {
      if (active) setResult(value);
    };
    const key = cacheKey(
      bookingId,
      startLat,
      startLng,
      destinationLat,
      destinationLng,
    );
    const hit = routeCache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      apply(hit.data);
      return () => {
        active = false;
      };
    }
    void Promise.all([
      reverseGeocode(startLat, startLng).catch(() => null),
      calculateRoute(
        [startLng, startLat],
        [destinationLng, destinationLat],
        bookingId,
      ).catch(() => null),
    ]).then(([geocode, route]) => {
      const value: BookingRouteResult = {
        route: route?.geojson ?? null,
        etaSeconds: route?.durationSeconds ?? null,
        distanceMeters: route?.distanceMeters ?? null,
        startAddress:
          geocode?.displayLabel ?? 'Worker starting location',
      };
      routeCache.set(key, { data: value, expiresAt: Date.now() + CACHE_TTL_MS });
      apply(value);
    });
    return () => {
      active = false;
    };
  }, [bookingId, destinationLat, destinationLng, startLat, startLng]);

  return result;
}
