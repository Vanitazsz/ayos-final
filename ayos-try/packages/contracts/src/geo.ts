import { z } from 'zod';

export const geoCoordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type GeoCoordinate = z.infer<typeof geoCoordinateSchema>;

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [longitude: number, latitude: number];
}
export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: [longitude: number, latitude: number][];
}
export interface GeoJsonFeature<G extends GeoJsonPoint | GeoJsonLineString> {
  type: 'Feature';
  geometry: G;
  properties: Record<string, string | number | boolean | null>;
}
export interface GeoJsonFeatureCollection<G extends GeoJsonPoint | GeoJsonLineString> {
  type: 'FeatureCollection';
  features: GeoJsonFeature<G>[];
}
export interface MapViewportState extends GeoCoordinate {
  zoom: number;
}
export interface RouteEstimate {
  distanceMeters: number;
  durationSeconds: number;
  route: GeoJsonFeature<GeoJsonLineString>;
}

export function pointFeature(
  coordinate: GeoCoordinate,
  properties: GeoJsonFeature<GeoJsonPoint>['properties'] = {},
): GeoJsonFeature<GeoJsonPoint> {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [coordinate.longitude, coordinate.latitude] },
    properties,
  };
}
