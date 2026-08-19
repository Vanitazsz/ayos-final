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

function computeHaversineEta(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): { distanceMeters: number; etaSeconds: number } {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const directKm = R * c;
  const roadKm = directKm * 1.3; // 1.3x road circuity factor
  const avgSpeedKmH = 25; // 25 km/h urban travel speed
  const etaHours = roadKm / avgSpeedKmH;
  const etaSeconds = Math.max(60, Math.round(etaHours * 3600));
  const distanceMeters = Math.round(roadKm * 1000);
  return { distanceMeters, etaSeconds };
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

    const mathFallback = computeHaversineEta(
      startLat,
      startLng,
      destinationLat,
      destinationLng,
    );

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
        etaSeconds: route?.durationSeconds ?? mathFallback.etaSeconds,
        distanceMeters: route?.distanceMeters ?? mathFallback.distanceMeters,
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
