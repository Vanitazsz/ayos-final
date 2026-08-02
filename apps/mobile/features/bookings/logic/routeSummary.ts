export interface RouteMetrics {
  distanceMeters?: number | null;
  durationSeconds?: number | null;
}

export interface RouteSummary {
  startAddress: string;
  distanceKm: number | null;
  minutes: number | null;
}

export const haversineKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export function buildRouteSummary(input: {
  directDistanceKm: number;
  displayLabel?: string | null;
  route?: RouteMetrics | null;
}): RouteSummary {
  return {
    startAddress: input.displayLabel ?? 'Worker starting location',
    distanceKm:
      Number(input.route?.distanceMeters ?? input.directDistanceKm * 1000) /
      1000,
    minutes:
      input.route?.durationSeconds == null
        ? Math.max(1, Math.round((input.directDistanceKm / 25) * 60))
        : Math.max(1, Math.ceil(Number(input.route.durationSeconds) / 60)),
  };
}
