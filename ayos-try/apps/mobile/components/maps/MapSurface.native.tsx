import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as MapLibreGL from '@maplibre/maplibre-react-native';

import { mapStyleUrl } from '@/lib/supabase';

import { easeOutCubic, radiusBounds, radiusGeoJson } from './radiusGeometry';

export type MapPoint = { id: string; latitude: number; longitude: number; color?: string };

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
  const cameraRef = useRef<MapLibreGL.CameraRef>(null);
  const animationFrameRef = useRef<number | null>(null);
  const displayedRadiusRef = useRef<number | undefined>(radiusMeters);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [displayedRadius, setDisplayedRadius] = useState(radiusMeters);

  useEffect(() => {
    if (!isMapLoaded) return;
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    if (!radiusMeters) {
      displayedRadiusRef.current = undefined;
      setDisplayedRadius(undefined);
      return;
    }

    const startRadius = displayedRadiusRef.current ?? radiusMeters;
    displayedRadiusRef.current = startRadius;
    cameraRef.current?.fitBounds(radiusBounds(mapCenter, radiusMeters), {
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
  }, [animateRadius, isMapLoaded, mapCenter, radiusMeters]);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
  }, []);

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
      <MapLibreGL.Camera ref={cameraRef} initialViewState={{ center: [mapCenter.longitude, mapCenter.latitude], zoom: 13 }} />
      {displayedRadius ? (
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
      {points.map((point) => (
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
