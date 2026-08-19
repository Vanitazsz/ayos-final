import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import type { MapPoint, MapInstance, FitBoundsOptions } from './types';

type CreateMapOptions = {
  container: HTMLElement;
  styleUrl: string;
  center: [number, number];
  zoom: number;
  interactive: boolean;
};

const RADIUS_SOURCE_ID = 'radius';
const RADIUS_FILL_LAYER_ID = 'radius-fill';
const RADIUS_LINE_LAYER_ID = 'radius-line';
const ROUTE_SOURCE_ID = 'route';
const ROUTE_LINE_LAYER_ID = 'route-line';

export type WebMapInstance = maplibregl.Map;

export function createMap(options: CreateMapOptions): WebMapInstance {
  const map = new maplibregl.Map({
    container: options.container,
    style: options.styleUrl,
    center: options.center,
    zoom: options.zoom,
    interactive: options.interactive,
  });
  map.addControl(new maplibregl.AttributionControl({ compact: true }));
  return map;
}

export function destroyMap(map: WebMapInstance): void {
  map.remove();
}

export function resizeMap(map: WebMapInstance): void {
  map.resize();
}

export function setCenter(map: WebMapInstance, center: [number, number]): void {
  map.setCenter(center);
}

export function fitBounds(
  map: WebMapInstance,
  bounds: [number, number, number, number],
  options?: FitBoundsOptions,
): void {
  map.fitBounds(bounds, options);
}

export function syncMarkers(map: WebMapInstance, points: MapPoint[]): maplibregl.Marker[] {
  return points.map((point) =>
    new maplibregl.Marker({ color: point.color ?? '#1e3a8a' })
      .setLngLat([point.longitude, point.latitude])
      .addTo(map),
  );
}

export function syncPopups(map: WebMapInstance, points: MapPoint[]): maplibregl.Popup[] {
  const popups: maplibregl.Popup[] = [];
  for (const point of points) {
    const labelText =
      point.label ??
      (point.id === 'worker'
        ? 'Worker'
        : point.id === 'destination'
          ? 'User'
          : point.id === 'start'
            ? 'Start'
            : undefined);
    if (labelText) {
      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
        focusAfterOpen: false,
      })
        .setLngLat([point.longitude, point.latitude])
        .setHTML(
          `<div style="font-size: 11px; font-weight: 700; color: #0f172a; padding: 2px 5px; font-family: sans-serif;">${labelText}</div>`,
        )
        .addTo(map);
      popups.push(popup);
    }
  }
  return popups;
}

export function setRouteSource(map: WebMapInstance, data: GeoJSON.FeatureCollection): void {
  const source = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
  } else {
    map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data });
    map.addLayer({
      id: ROUTE_LINE_LAYER_ID,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      paint: { 'line-color': '#1e3a8a', 'line-width': 4 },
    });
  }
}

export function removeRouteSource(map: WebMapInstance): void {
  const source = map.getSource(ROUTE_SOURCE_ID);
  if (source) {
    map.removeLayer(ROUTE_LINE_LAYER_ID);
    map.removeSource(ROUTE_SOURCE_ID);
  }
}

export function setRadiusSource(map: WebMapInstance, data: GeoJSON.FeatureCollection): void {
  const source = map.getSource(RADIUS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
  } else {
    map.addSource(RADIUS_SOURCE_ID, { type: 'geojson', data });
    map.addLayer({
      id: RADIUS_FILL_LAYER_ID,
      type: 'fill',
      source: RADIUS_SOURCE_ID,
      paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.18 },
    });
    map.addLayer({
      id: RADIUS_LINE_LAYER_ID,
      type: 'line',
      source: RADIUS_SOURCE_ID,
      paint: {
        'line-color': '#1d4ed8',
        'line-width': 2.5,
        'line-opacity': 0.9,
      },
    });
  }
}

export function removeRadiusSource(map: WebMapInstance): void {
  const source = map.getSource(RADIUS_SOURCE_ID);
  if (source) {
    map.removeLayer(RADIUS_LINE_LAYER_ID);
    map.removeLayer(RADIUS_FILL_LAYER_ID);
    map.removeSource(RADIUS_SOURCE_ID);
  }
}
