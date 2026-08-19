import type { ComponentType } from 'react';
import type { MapPoint } from './types';

export type { MapPoint } from './types';

export const MapSurface: ComponentType<{
  center: { latitude: number; longitude: number };
  points: MapPoint[];
  route?: GeoJSON.FeatureCollection;
  interactive?: boolean;
  radiusMeters?: number;
  animateRadius?: boolean;
}>;
