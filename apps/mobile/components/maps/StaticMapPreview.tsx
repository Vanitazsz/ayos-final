import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MapPin } from 'lucide-react-native';

import { theme } from '@/constants/theme';

const TILE_SIZE = 256;
const TILE_STRIDE = TILE_SIZE - 1;
const GRID = 3;
const METERS_PER_PIXEL_EQUATOR = 156543.03392;
const MIN_ZOOM = 8;
const MAX_ZOOM = 17;
const DEFAULT_ZOOM = 15;
const MAX_DIAMETER_FRACTION = 0.9;

type StaticMapPreviewProps = {
  center: { latitude: number; longitude: number };
  radiusKm?: number;
  zoom?: number;
  height?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function StaticMapPreview({
  center,
  radiusKm,
  zoom,
  height = 220,
}: StaticMapPreviewProps) {
  const [width, setWidth] = useState(0);

  const valid =
    Number.isFinite(center.latitude) && Number.isFinite(center.longitude);

  const cosLat = Math.cos((center.latitude * Math.PI) / 180);

  const zoomLevel = useMemo(() => {
    if (!valid) return null;
    if (zoom != null) return clamp(Math.round(zoom), MIN_ZOOM, MAX_ZOOM);
    if (!width || radiusKm == null || radiusKm <= 0) return DEFAULT_ZOOM;
    const fitPx = Math.min(width, height) * MAX_DIAMETER_FRACTION;
    const radiusMeters = radiusKm * 1000;
    const z = Math.log2(
      (fitPx * METERS_PER_PIXEL_EQUATOR * cosLat) / (2 * radiusMeters),
    );
    return clamp(Math.floor(z), MIN_ZOOM, MAX_ZOOM);
  }, [width, height, zoom, radiusKm, valid, cosLat]);

  const layout = useMemo(() => {
    if (!width || !valid || zoomLevel == null) return null;
    const scale = 2 ** zoomLevel;
    const worldX = ((center.longitude + 180) / 360) * TILE_SIZE * scale;
    const latRad = (center.latitude * Math.PI) / 180;
    const mercY =
      (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
    const worldY = mercY * TILE_SIZE * scale;
    const centerTileX = Math.floor(worldX / TILE_SIZE);
    const centerTileY = Math.floor(worldY / TILE_SIZE);
    const offsetInTileX = worldX - centerTileX * TILE_SIZE;
    const offsetInTileY = worldY - centerTileY * TILE_SIZE;
    const centerPxInGridX =
      ((GRID - 1) / 2) * TILE_STRIDE + offsetInTileX;
    const centerPxInGridY =
      ((GRID - 1) / 2) * TILE_STRIDE + offsetInTileY;
    const originX = Math.round(width / 2 - centerPxInGridX);
    const originY = Math.round(height / 2 - centerPxInGridY);
    const mPerPx = (METERS_PER_PIXEL_EQUATOR * cosLat) / scale;
    const radiusPx = radiusKm != null ? (radiusKm * 1000) / mPerPx : null;
    const tiles: { left: number; top: number; uri: string }[] = [];
    for (let gx = 0; gx < GRID; gx += 1) {
      for (let gy = 0; gy < GRID; gy += 1) {
        const tx = centerTileX + (gx - 1);
        const ty = centerTileY + (gy - 1);
        const tileX = ((tx % scale) + scale) % scale;
        const tileY = clamp(ty, 0, scale - 1);
        tiles.push({
          left: originX + gx * TILE_STRIDE,
          top: originY + gy * TILE_STRIDE,
          uri: `https://tile.openstreetmap.org/${zoomLevel}/${tileX}/${tileY}.png`,
        });
      }
    }
    return { tiles, radiusPx };
  }, [width, height, valid, zoomLevel, center.longitude, center.latitude, cosLat, radiusKm]);

  return (
    <View
      style={[styles.container, { height }]}
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.width);
        setWidth((current) => (current === next ? current : next));
      }}
    >
      {layout ? (
        layout.tiles.map((tile) => (
          <Image
            key={tile.uri}
            source={{ uri: tile.uri }}
            style={[styles.tile, { left: tile.left, top: tile.top }]}
            contentFit="fill"
            transition={0}
          />
        ))
      ) : (
        <Text style={styles.unavailable}>Map unavailable</Text>
      )}
      {layout?.radiusPx != null ? (
        <View
          pointerEvents="none"
          style={[
            styles.radiusRing,
            {
              width: layout.radiusPx * 2,
              height: layout.radiusPx * 2,
              borderRadius: layout.radiusPx,
              left: width / 2 - layout.radiusPx,
              top: height / 2 - layout.radiusPx,
            },
          ]}
        />
      ) : null}
      {layout?.radiusPx != null ? (
        <View
          pointerEvents="none"
          style={[
            styles.centerDot,
            { left: width / 2 - 4, top: height / 2 - 4 },
          ]}
        />
      ) : null}
      {radiusKm != null ? (
        <View pointerEvents="none" style={styles.radiusBadge}>
          <Text style={styles.radiusBadgeText}>
            Search radius: {radiusKm} km
          </Text>
        </View>
      ) : null}
      <View pointerEvents="none" style={styles.pinWrap}>
        <MapPin
          size={30}
          color={theme.colors.error}
          fill={theme.colors.error}
        />
      </View>
      <Text pointerEvents="none" style={styles.attribution}>
        © OpenStreetMap
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    backgroundColor: theme.colors.borderLight,
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  pinWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusRing: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#1d4ed8',
    backgroundColor: 'rgba(37, 99, 235, 0.18)',
  },
  centerDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1d4ed8',
  },
  radiusBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  radiusBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  attribution: {
    position: 'absolute',
    right: 6,
    bottom: 4,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  unavailable: {
    color: theme.colors.textSecondary,
  },
});
