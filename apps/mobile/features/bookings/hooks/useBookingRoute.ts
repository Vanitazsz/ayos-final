import { useEffect, useState } from 'react';

import { calculateRoute, type RouteResult } from '@/services/routing';

interface BookingRouteInput {
  bookingId?: string;
  destinationLat: number;
  destinationLng: number;
  startLat?: number;
  startLng?: number;
  workerLat?: number;
  workerLng?: number;
}

export function useBookingRoute(input: BookingRouteInput) {
  const [route, setRoute] = useState<RouteResult['geojson']>();
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const routeLat = input.workerLat ?? input.startLat;
  const routeLng = input.workerLng ?? input.startLng;

  useEffect(() => {
    if (routeLat == null || routeLng == null) return;
    let active = true;
    void calculateRoute(
      [routeLng, routeLat],
      [input.destinationLng, input.destinationLat],
      input.bookingId,
    )
      .then((value) => {
        if (!active) return;
        setRoute(value.geojson);
        setEtaSeconds(value.durationSeconds ?? null);
      })
      .catch(() => {
        if (!active) return;
        setRoute(undefined);
        setEtaSeconds(null);
      });
    return () => {
      active = false;
    };
  }, [
    input.bookingId,
    input.destinationLat,
    input.destinationLng,
    routeLat,
    routeLng,
  ]);

  return { etaSeconds, route, routeLat, routeLng };
}
