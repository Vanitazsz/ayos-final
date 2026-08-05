import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MapPin } from 'lucide-react-native';

import { theme } from '@/constants/theme';

const TILE_SIZE = 256;
const GRID = 3;

type StaticMapPreviewProps = {
  center: { latitude: number; longitude: number };
  radiusKm?: number;
  zoom?: number;
  height?: number;
};

export function StaticMapPreview({
  center,
  radiusKm,
  zoom = 15,
  height = 220,
}: StaticMapPreviewProps) {
  const [width, setWidth] = useState(0);

  const valid =
    Number.isFinite(center.latitude) && Number.isFinite(center.longitude);

  const layout = useMemo(() => {
    if (!width || !valid) return null;
    const scale = 2 ** zoom;
    const worldX = ((center.longitude + 180) / 360) * TILE_SIZE * scale;
    const latRad = (center.latitude * Math.PI) / 180;
    const mercY =
      (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
    const worldY = mercY * TILE_SIZE * scale;
    const centerTileX = Math.floor(worldX / TILE_SIZE);
    const centerTileY = Math.floor(worldY / TILE_SIZE);
    const offsetInTileX = worldX - centerTileX * TILE_SIZE;
    const offsetInTileY = worldY - centerTileY * TILE_SIZE;
    const centerPxInGridX = TILE_SIZE + offsetInTileX;
    const centerPxInGridY = TILE_SIZE + offsetInTileY;
    const translateX = Math.round(width / 2 - centerPxInGridX);
    const translateY = Math.round(height / 2 - centerPxInGridY);
    const urls: string[] = [];
    for (let gx = 0; gx < GRID; gx += 1) {
      for (let gy = 0; gy < GRID; gy += 1) {
        const tx = centerTileX + (gx - 1);
        const ty = centerTileY + (gy - 1);
        const tileX = ((tx % scale) + scale) % scale;
        const tileY = Math.min(Math.max(ty, 0), scale - 1);
        urls.push(
          `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`,
        );
      }
    }
    return { urls, translateX, translateY };
  }, [center.latitude, center.longitude, width, height, zoom, valid]);

  return (
    <View
      style={[styles.container, { height }]}
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.width);
        setWidth((current) => (current === next ? current : next));
      }}
    >
      {layout ? (
        <View
          style={[
            styles.grid,
            {
              transform: [
                { translateX: layout.translateX },
                { translateY: layout.translateY },
              ],
            },
          ]}
        >
          {layout.urls.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              style={styles.tile}
              contentFit="cover"
              transition={0}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.unavailable}>Map unavailable</Text>
      )}
      {radiusKm != null ? (
        <View style={styles.radiusBadge}>
          <Text style={styles.radiusBadgeText}>
            Search radius: {radiusKm} km
          </Text>
        </View>
      ) : null}
      <View style={styles.pinWrap} pointerEvents="none">
        <MapPin
          size={30}
          color={theme.colors.error}
          fill={theme.colors.error}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.borderLight,
  },
  grid: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: GRID * TILE_SIZE,
    height: GRID * TILE_SIZE,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  pinWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
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
  unavailable: {
    color: theme.colors.textSecondary,
  },
});
