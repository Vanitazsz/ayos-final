import { invokeAuthenticatedFunction } from '@/services/authenticatedFunctions';

export interface RouteResult {
  geojson?: GeoJSON.FeatureCollection;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
}

interface RouteResponse {
  data: RouteResult;
}

export async function calculateRoute(
  start: [number, number],
  end: [number, number],
  bookingId?: string,
): Promise<RouteResult> {
  const data = await invokeAuthenticatedFunction<RouteResponse>('route', {
    body: { start, end, bookingId },
  });
  return data.data;
}
