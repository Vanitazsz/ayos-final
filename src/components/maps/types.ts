// ── Shared data types ──────────────────────────────────────────────

export type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  color?: string;
  label?: string;
};

export type MapSurfaceProps = {
  center: { latitude: number; longitude: number };
  points: MapPoint[];
  route?: GeoJSON.FeatureCollection;
  interactive?: boolean;
  radiusMeters?: number;
  animateRadius?: boolean;
};

// ── MapLibre Provider interface ────────────────────────────────────
//
// Both MapLibreProvider.web.ts and MapLibreProvider.native.ts must
// export every symbol declared here. MapSurface files import them
// via `import * as MapLibre from './MapLibreProvider'` — Expo resolves
// the correct platform file at bundle time.
//
// The two implementations have different internal APIs (imperative
// functions on web, React components on native), but they share
// these exported names so MapSurface can consume them uniformly.

/** Opaque handle to the underlying map instance. */
export type MapInstance = unknown;

/** Ref type for the camera (platform-specific). */
export type CameraRef = unknown;

/** Options for fitting the camera to a bounding box. */
export type FitBoundsOptions = {
  padding?: number | { top: number; right: number; bottom: number; left: number };
  maxZoom?: number;
  duration?: number;
};
