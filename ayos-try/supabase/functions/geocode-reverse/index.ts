import { corsHeadersFor, failure, handleError, success } from '../_frontend_shared/http.ts';
import { requestContext } from '../_frontend_shared/supabase.ts';
import {
  assertPhilippines,
  cached,
  enforceGeoRateLimit,
  normalizeFeature,
  ors,
} from '../_frontend_shared/geocoding.ts';
Deno.serve(async (request) => {
  Object.assign((await import('../_frontend_shared/http.ts')).corsHeaders, corsHeadersFor(request));
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(request) });
  try {
    if (request.method !== 'GET') return failure(405, 'method_not_allowed', 'GET required');
    const { admin, user } = await requestContext(request);
    const url = new URL(request.url);
    const lat = Number(url.searchParams.get('lat'));
    const lon = Number(url.searchParams.get('lon'));
    assertPhilippines(lat, lon);
    const result = await cached(
      admin,
      'REVERSE',
      { lat: Math.round(lat * 100000) / 100000, lon: Math.round(lon * 100000) / 100000 },
      2592000,
      async () => {
        await enforceGeoRateLimit(admin, user.id);
        const params = new URLSearchParams({
          'point.lat': String(lat),
          'point.lon': String(lon),
          size: '1',
        });
        const body = await ors(`/geocode/reverse?${params}`);
        return body.features?.[0] ? normalizeFeature(body.features[0]) : null;
      },
    );
    return success({
      result: result.value,
      cached: result.cached,
      attribution: '© OpenStreetMap contributors, OpenRouteService',
    });
  } catch (error) {
    return handleError(error);
  }
});
