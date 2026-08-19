import { useRef, useCallback } from 'react';
import * as MapLibreGL from '@maplibre/maplibre-react-native';

import type { FitBoundsOptions } from './types';

export const MapView = MapLibreGL.Map;
export const Camera = MapLibreGL.Camera;
export const Marker = MapLibreGL.Marker;
export const GeoJSONSource = MapLibreGL.GeoJSONSource;
export const Layer = MapLibreGL.Layer;

export type NativeCameraRef = MapLibreGL.CameraRef;

/**
 * Wraps cameraRef.fitBounds with retry logic.
 *
 * The underlying @maplibre/maplibre-react-native@11.3.6 (patched) guards
 * against nil camera and zero-size frames at the ObjC level. This hook
 * provides the complementary JS-side guard: if cameraRef.current is not
 * yet mounted, it retries up to 10 frames via requestAnimationFrame.
 */
export function useSafeFitBounds() {
  const attemptRef = useRef(0);

  const fitBounds = useCallback(
    (
      cameraRef: React.RefObject<NativeCameraRef | null>,
      bounds: [number, number, number, number],
      options?: FitBoundsOptions,
    ) => {
      if (!bounds.every((value) => Number.isFinite(value))) return;
      attemptRef.current = 0;
      const attempt = () => {
        if (attemptRef.current >= 10) return;
        attemptRef.current += 1;
        try {
          const padding =
            typeof options?.padding === 'number'
              ? {
                  top: options.padding,
                  right: options.padding,
                  bottom: options.padding,
                  left: options.padding,
                }
              : options?.padding;
          cameraRef.current?.fitBounds(bounds, { ...options, padding });
        } catch {
          requestAnimationFrame(attempt);
        }
      };
      requestAnimationFrame(attempt);
    },
    [],
  );

  return fitBounds;
}
