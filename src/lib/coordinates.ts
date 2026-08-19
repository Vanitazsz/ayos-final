export const PHILIPPINES_LATITUDE_BOUNDS = { min: 4, max: 22 } as const;
export const PHILIPPINES_LONGITUDE_BOUNDS = { min: 116, max: 127 } as const;
export const WORLD_LATITUDE_BOUNDS = { min: -90, max: 90 } as const;
export const WORLD_LONGITUDE_BOUNDS = { min: -180, max: 180 } as const;

export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

function isFiniteInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

export function isWorldCoordinates(
  coords: { latitude: number; longitude: number } | null | undefined,
): boolean {
  if (!coords) return false;
  return (
    isFiniteInRange(coords.latitude, WORLD_LATITUDE_BOUNDS.min, WORLD_LATITUDE_BOUNDS.max) &&
    isFiniteInRange(coords.longitude, WORLD_LONGITUDE_BOUNDS.min, WORLD_LONGITUDE_BOUNDS.max)
  );
}

export function isPhilippinesCoordinates(
  coords: { latitude: number; longitude: number } | null | undefined,
): boolean {
  if (!coords) return false;
  return (
    isFiniteInRange(
      coords.latitude,
      PHILIPPINES_LATITUDE_BOUNDS.min,
      PHILIPPINES_LATITUDE_BOUNDS.max,
    ) &&
    isFiniteInRange(
      coords.longitude,
      PHILIPPINES_LONGITUDE_BOUNDS.min,
      PHILIPPINES_LONGITUDE_BOUNDS.max,
    )
  );
}

export function isValidRouteGeojson(route: GeoJSON.FeatureCollection | null | undefined): boolean {
  if (!route || route.type !== 'FeatureCollection') return false;
  const feature = route.features?.[0];
  if (!feature?.geometry || feature.geometry.type !== 'LineString') return false;
  const coords = feature.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return false;
  return coords.every(
    (c) => Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]),
  );
}
