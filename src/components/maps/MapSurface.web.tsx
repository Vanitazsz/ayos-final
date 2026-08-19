import React, { useEffect, useMemo, useRef, useState } from 'react';

import { mapStyleUrl } from '@/lib/supabase';

import type { MapSurfaceProps } from './types';
import { easeOutCubic, radiusBounds, radiusGeoJson } from './radiusGeometry';
import * as MapLibre from './MapLibreProvider';

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
  const mapRef = useRef<MapLibre.WebMapInstance | null>(null);
  const markerRefs = useRef<import('maplibre-gl').Marker[]>([]);
  const popupRefs = useRef<import('maplibre-gl').Popup[]>([]);
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

      const { center: initCenter, interactive: initInteractive } = initialMapOptionsRef.current;
      const map = MapLibre.createMap({
        container,
        styleUrl: mapStyleUrl,
        center: [initCenter.longitude, initCenter.latitude],
        zoom: 13,
        interactive: initInteractive,
      });
      map.on('load', () => {
        MapLibre.resizeMap(map);
        setIsMapLoaded(true);
      });
      mapRef.current = map;
    };

    const observer = new ResizeObserver(() => {
      ensureMap();
      if (mapRef.current) MapLibre.resizeMap(mapRef.current);
    });
    observer.observe(container);
    ensureMap();

    return () => {
      observer.disconnect();
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      popupRefs.current.forEach((popup) => popup.remove());
      markerRefs.current.forEach((marker) => marker.remove());
      if (mapRef.current) MapLibre.destroyMap(mapRef.current);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    MapLibre.setCenter(map, [mapCenter.longitude, mapCenter.latitude]);
    popupRefs.current.forEach((popup) => popup.remove());
    popupRefs.current = [];
    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = MapLibre.syncMarkers(map, points);
    popupRefs.current = MapLibre.syncPopups(map, points);

    if (route) {
      MapLibre.setRouteSource(map, route);
    } else {
      MapLibre.removeRouteSource(map);
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
    MapLibre.fitBounds(map, box, { padding: 40, maxZoom: 15, duration: 0 });
  }, [isMapLoaded, points, radiusMeters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);

    if (!radiusMeters) {
      displayedRadiusRef.current = undefined;
      MapLibre.removeRadiusSource(map);
      return;
    }

    const setRadiusData = (meters: number) => {
      MapLibre.setRadiusSource(map, radiusGeoJson(mapCenter, meters));
    };

    const startRadius = displayedRadiusRef.current ?? radiusMeters;
    displayedRadiusRef.current = startRadius;
    MapLibre.fitBounds(map, radiusBounds(mapCenter, radiusMeters), {
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
