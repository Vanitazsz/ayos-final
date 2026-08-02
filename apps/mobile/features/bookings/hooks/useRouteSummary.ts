import { useEffect, useState } from 'react';

import {
  buildRouteSummary,
  haversineKm,
  type RouteSummary,
} from '@/features/bookings/logic/routeSummary';
import { reverseGeocode } from '@/services/geocoding';
import { calculateRoute } from '@/services/routing';

interface RouteSummaryInput {
  bookingId?: string;
  startLat?: number | null;
  startLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
}

const initialSummary: RouteSummary = {
  startAddress: 'Worker starting location',
  distanceKm: null,
  minutes: null,
};

export function useRouteSummary(input: RouteSummaryInput) {
  const [summary, setSummary] = useState<RouteSummary | null>(null);

  useEffect(() => {
    if (
      input.startLat == null ||
      input.startLng == null ||
      input.destinationLat == null ||
      input.destinationLng == null
    ) {
      setSummary(null);
      return;
    }
    let active = true;
    const directDistanceKm = haversineKm(
      input.startLat,
      input.startLng,
      input.destinationLat,
      input.destinationLng,
    );
    void Promise.all([
      reverseGeocode(input.startLat, input.startLng).catch(() => null),
      calculateRoute(
        [input.startLng, input.startLat],
        [input.destinationLng, input.destinationLat],
        input.bookingId,
      ).catch(() => null),
    ]).then(([geocode, route]) => {
      if (!active) return;
      setSummary(
        buildRouteSummary({
          directDistanceKm,
          displayLabel: geocode?.displayLabel,
          route,
        }),
      );
    });
    return () => {
      active = false;
    };
  }, [
    input.bookingId,
    input.destinationLat,
    input.destinationLng,
    input.startLat,
    input.startLng,
  ]);

  return summary ?? initialSummary;
}
