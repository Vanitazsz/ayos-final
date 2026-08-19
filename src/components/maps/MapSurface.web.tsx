import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { mapStyleUrl } from '@/lib/supabase';

import type { MapPoint } from './MapSurface.native';
import { easeOutCubic, radiusBounds, radiusGeoJson } from './radiusGeometry';

type MapSurfaceProps = {
  center: { latitude: number; longitude: number };
  points: MapPoint[];
  route?: GeoJSON.FeatureCollection;
  interactive?: boolean;
  radiusMeters?: number;
  animateRadius?: boolean;
};

const RADIUS_ANIMATION_MS = 320;
const RADIUS_PADDING = 32;

export function MapSurface({
  center,
  points,
  route,
  interactive = true,
  radiusMeters,
  animateRadius = false,
}: MapSurfaceProps) {
  const mapCenter = useMemo(
    () => ({ latitude: center.latitude, longitude: center.longitude }),
    [center.latitude, center.longitude],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const initialMapOptionsRef = useRef({ center: mapCenter, interactive });
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const popupRefs = useRef<maplibregl.Popup[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastFitBoundsRef = useRef<string | undefined>(undefined);
  const displayedRadiusRef = useRef<number | undefined>(undefined);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ensureMap = () => {
      if (mapRef.current) return;
      const width = Math.round(container.clientWidth);
      const height = Math.round(container.clientHeight);
      if (width === 0 || height === 0) return;

      const initialMapOptions = initialMapOptionsRef.current;
      const map = new maplibregl.Map({
        container,
        style: mapStyleUrl,
        center: [initialMapOptions.center.longitude, initialMapOptions.center.latitude],
        zoom: 13,
        interactive: initialMapOptions.interactive,
      });
      map.addControl(new maplibregl.AttributionControl({ compact: true }));
      map.on('load', () => {
        map.resize();
        setIsMapLoaded(true);
      });
      mapRef.current = map;
    };

    const observer = new ResizeObserver(() => {
      ensureMap();
      mapRef.current?.resize();
    });
    observer.observe(container);
    ensureMap();

    return () => {
      observer.disconnect();
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      popupRefs.current.forEach((popup) => popup.remove());
      markerRefs.current.forEach((marker) => marker.remove());
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    map.setCenter([mapCenter.longitude, mapCenter.latitude]);
    popupRefs.current.forEach((popup) => popup.remove());
    popupRefs.current = [];
    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = points.map((point) => {
      const marker = new maplibregl.Marker({ color: point.color ?? '#1e3a8a' })
        .setLngLat([point.longitude, point.latitude])
        .addTo(map);

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
          .setHTML(`<div style="font-size: 11px; font-weight: 700; color: #0f172a; padding: 2px 5px; font-family: sans-serif;">${labelText}</div>`)
          .addTo(map);
        popupRefs.current.push(popup);
      }
      return marker;
    });

    const routeSource = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
    if (route) {
      if (routeSource) routeSource.setData(route);
      else {
        map.addSource('route', { type: 'geojson', data: route });
        map.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#1e3a8a', 'line-width': 4 } });
      }
    } else if (routeSource) {
      map.removeLayer('route-line');
      map.removeSource('route');
    }
  }, [isMapLoaded, mapCenter, points, route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || radiusMeters || points.length < 2) return;
    const lats = points.map((point) => point.latitude);
    const lngs = points.map((point) => point.longitude);
    const box: [number, number, number, number] = [
      Math.min(...lngs),
      Math.min(...lats),
      Math.max(...lngs),
      Math.max(...lats),
    ];
    const key = box.map((value) => value.toFixed(6)).join(',');
    if (key === lastFitBoundsRef.current) return;
    lastFitBoundsRef.current = key;
    map.fitBounds(box, { padding: 40, maxZoom: 15, duration: 0 });
  }, [isMapLoaded, points, radiusMeters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);

    const radiusSource = map.getSource('radius') as maplibregl.GeoJSONSource | undefined;
    if (!radiusMeters) {
      displayedRadiusRef.current = undefined;
      if (radiusSource) {
        map.removeLayer('radius-line');
        map.removeLayer('radius-fill');
        map.removeSource('radius');
      }
      return;
    }

    const setRadiusData = (meters: number) => {
      const source = map.getSource('radius') as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData(radiusGeoJson(mapCenter, meters));
      else {
        map.addSource('radius', { type: 'geojson', data: radiusGeoJson(mapCenter, meters) });
        map.addLayer({ id: 'radius-fill', type: 'fill', source: 'radius', paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.18 } });
        map.addLayer({ id: 'radius-line', type: 'line', source: 'radius', paint: { 'line-color': '#1d4ed8', 'line-width': 2.5, 'line-opacity': 0.9 } });
      }
    };

    const startRadius = displayedRadiusRef.current ?? radiusMeters;
    displayedRadiusRef.current = startRadius;
    map.fitBounds(radiusBounds(mapCenter, radiusMeters), {
      padding: RADIUS_PADDING,
      duration: animateRadius ? RADIUS_ANIMATION_MS : 0,
    });

    if (!animateRadius || startRadius === radiusMeters) {
      setRadiusData(radiusMeters);
      displayedRadiusRef.current = radiusMeters;
      return;
    }

    const startedAt = performance.now();
    const renderFrame = (now: number) => {
      const progress = Math.min((now - startedAt) / RADIUS_ANIMATION_MS, 1);
      const displayedRadius = startRadius + (radiusMeters - startRadius) * easeOutCubic(progress);
      setRadiusData(displayedRadius);
      displayedRadiusRef.current = displayedRadius;
      if (progress < 1) animationFrameRef.current = requestAnimationFrame(renderFrame);
      else {
        displayedRadiusRef.current = radiusMeters;
        animationFrameRef.current = null;
      }
    };
    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [animateRadius, isMapLoaded, mapCenter, radiusMeters]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
