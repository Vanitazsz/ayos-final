export const DEFAULT_MAP_STYLE = "https://demotiles.maplibre.org/style.json";
export type Coordinates = { latitude: number; longitude: number };

export function toGeoJsonPoint(value: Coordinates) {
  return { type: "Point" as const, coordinates: [value.longitude, value.latitude] as [number, number] };
}
