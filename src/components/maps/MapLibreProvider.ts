import type { RefObject } from 'react';
import type maplibregl from 'maplibre-gl';

import type { MapPoint, FitBoundsOptions } from './types';

export type { MapPoint, FitBoundsOptions } from './types';

export type WebMapInstance = maplibregl.Map;

export type NativeCameraRef = {
  fitBounds: (
    bounds: [number, number, number, number],
    options?: { padding?: { top: number; right: number; bottom: number; left: number } },
  ) => void;
  setStop: (stop: { zoom?: number }) => Promise<void>;
};

export type CreateMapOptions = {
  container: HTMLElement;
  styleUrl: string;
  center: [number, number];
  zoom: number;
  interactive: boolean;
};

export declare const MapView: React.ComponentType<Record<string, unknown>>;
export declare const Camera: React.ComponentType<Record<string, unknown>> & {
  ref?: RefObject<NativeCameraRef>;
};
export declare const Marker: React.ComponentType<Record<string, unknown>>;
export declare const GeoJSONSource: React.ComponentType<Record<string, unknown>>;
export declare const Layer: React.ComponentType<Record<string, unknown>>;

export declare function useSafeFitBounds(): (
  cameraRef: RefObject<NativeCameraRef | null>,
  bounds: [number, number, number, number],
  options?: FitBoundsOptions,
) => void;

export declare function createMap(options: CreateMapOptions): WebMapInstance;
export declare function destroyMap(map: WebMapInstance): void;
export declare function resizeMap(map: WebMapInstance): void;
export declare function setCenter(map: WebMapInstance, center: [number, number]): void;
export declare function fitBounds(
  map: WebMapInstance,
  bounds: [number, number, number, number],
  options?: FitBoundsOptions,
): void;
export declare function syncMarkers(map: WebMapInstance, points: MapPoint[]): maplibregl.Marker[];
export declare function syncPopups(map: WebMapInstance, points: MapPoint[]): maplibregl.Popup[];
export declare function setRouteSource(map: WebMapInstance, data: GeoJSON.FeatureCollection): void;
export declare function removeRouteSource(map: WebMapInstance): void;
export declare function setRadiusSource(map: WebMapInstance, data: GeoJSON.FeatureCollection): void;
export declare function removeRadiusSource(map: WebMapInstance): void;
