export const PHILIPPINES_LATITUDE_BOUNDS = { min: 4, max: 22 } as const;
export const PHILIPPINES_LONGITUDE_BOUNDS = { min: 116, max: 127 } as const;
export const WORLD_LATITUDE_BOUNDS = { min: -90, max: 90 } as const;

export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

function isFiniteInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

export function isWorldCoordinates(
  coords: { latitude: number; longitude: number } | null | undefined,
): boolean {
  if (!coords) return false;
  return (
    isFiniteInRange(
      coords.latitude,
      WORLD_LATITUDE_BOUNDS.min,
      WORLD_LATITUDE_BOUNDS.max,
    ) && Number.isFinite(coords.longitude)
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
