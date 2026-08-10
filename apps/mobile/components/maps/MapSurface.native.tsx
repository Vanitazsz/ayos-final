import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as MapLibreGL from '@maplibre/maplibre-react-native';

import { mapStyleUrl } from '@/lib/supabase';
import { isWorldCoordinates } from '@/lib/coordinates';

import { easeOutCubic, radiusBounds, radiusGeoJson } from './radiusGeometry';

export type MapPoint = { id: string; latitude: number; longitude: number; color?: string; label?: string };

type MapSurfaceProps = {
  center: { latitude: number; longitude: number };
  points: MapPoint[];
  route?: GeoJSON.FeatureCollection;
  interactive?: boolean;
  radiusMeters?: number;
  animateRadius?: boolean;
};

const RADIUS_ANIMATION_MS = 320;

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
  const isCenterValid = useMemo(
    () => isWorldCoordinates(mapCenter),
    [mapCenter],
  );
  const cameraRef = useRef<MapLibreGL.CameraRef>(null);
  const animationFrameRef = useRef<number | null>(null);
  const displayedRadiusRef = useRef<number | undefined>(radiusMeters);
  const lastFitBoundsRef = useRef<string | undefined>(undefined);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [displayedRadius, setDisplayedRadius] = useState(radiusMeters);

  const fitCameraBounds = useCallback(
    (
      bounds: [number, number, number, number],
      options?: Parameters<MapLibreGL.CameraRef['fitBounds']>[1],
    ) => {
      if (!bounds.every((value) => Number.isFinite(value))) return;
      let attempts = 0;
      const attempt = () => {
        if (attempts >= 10) return;
        attempts += 1;
        try {
          cameraRef.current?.fitBounds(bounds, options);
        } catch {
          requestAnimationFrame(attempt);
        }
      };
      requestAnimationFrame(attempt);
    },
    [],
  );

  useEffect(() => {
    if (!isMapLoaded) return;
    if (!isCenterValid) return;
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    if (!radiusMeters) {
      displayedRadiusRef.current = undefined;
      setDisplayedRadius(undefined);
      return;
    }

    const startRadius = displayedRadiusRef.current ?? radiusMeters;
    displayedRadiusRef.current = startRadius;
    fitCameraBounds(radiusBounds(mapCenter, radiusMeters), {
      padding: { top: 32, right: 32, bottom: 32, left: 32 },
      duration: animateRadius ? RADIUS_ANIMATION_MS : 0,
    });

    if (!animateRadius || startRadius === radiusMeters) {
      displayedRadiusRef.current = radiusMeters;
      setDisplayedRadius(radiusMeters);
      return;
    }

    const startedAt = Date.now();
    const renderFrame = () => {
      const progress = Math.min((Date.now() - startedAt) / RADIUS_ANIMATION_MS, 1);
      const nextRadius = startRadius + (radiusMeters - startRadius) * easeOutCubic(progress);
      displayedRadiusRef.current = nextRadius;
      setDisplayedRadius(nextRadius);
      if (progress < 1) animationFrameRef.current = requestAnimationFrame(renderFrame);
      else animationFrameRef.current = null;
    };
    animationFrameRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [animateRadius, fitCameraBounds, isCenterValid, isMapLoaded, mapCenter, radiusMeters]);

  useEffect(() => {
    if (!isMapLoaded || radiusMeters || points.length < 2) return;
    if (!isCenterValid) return;
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
    fitCameraBounds(box, {
      padding: { top: 40, right: 40, bottom: 40, left: 40 },
      duration: 0,
    });
  }, [fitCameraBounds, isCenterValid, isMapLoaded, points, radiusMeters]);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
  }, []);

  useEffect(() => {
    // TEMP-DIAG: log center on mount to pinpoint invalid-coordinate source.
    console.log(
      `[MapSurface] mount center=${JSON.stringify(center)} radiusMeters=${radiusMeters} valid=${isCenterValid}`,
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MapLibreGL.Map
      style={styles.map}
      mapStyle={mapStyleUrl}
      dragPan={interactive}
      touchZoom={interactive}
      doubleTapZoom={interactive}
      touchRotate={interactive}
      onDidFinishLoadingMap={() => setIsMapLoaded(true)}
    >
      <MapLibreGL.Camera
        ref={cameraRef}
        initialViewState={
          isCenterValid
            ? { center: [mapCenter.longitude, mapCenter.latitude], zoom: 13 }
            : { zoom: 3 }
        }
      />
      {isCenterValid && displayedRadius ? (
        <MapLibreGL.GeoJSONSource id="radius" data={radiusGeoJson(mapCenter, displayedRadius)}>
          <MapLibreGL.Layer id="radius-fill" type="fill" paint={{ 'fill-color': '#2563eb', 'fill-opacity': 0.18 }} />
          <MapLibreGL.Layer id="radius-line" type="line" paint={{ 'line-color': '#1d4ed8', 'line-width': 2.5, 'line-opacity': 0.9 }} />
        </MapLibreGL.GeoJSONSource>
      ) : null}
      {route ? (
        <MapLibreGL.GeoJSONSource id="route" data={route}>
          <MapLibreGL.Layer id="route-line" type="line" paint={{ 'line-color': '#1e3a8a', 'line-width': 4 }} />
        </MapLibreGL.GeoJSONSource>
      ) : null}
      {points.filter(isWorldCoordinates).map((point) => (
        <MapLibreGL.Marker key={point.id} id={point.id} lngLat={[point.longitude, point.latitude]}>
          <View style={[styles.marker, { backgroundColor: point.color ?? '#1e3a8a' }]} />
        </MapLibreGL.Marker>
      ))}
    </MapLibreGL.Map>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  marker: { width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: '#fff' },
});
