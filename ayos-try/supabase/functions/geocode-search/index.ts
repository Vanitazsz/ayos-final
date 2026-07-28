import {
  corsHeadersFor,
  failure,
  handleError,
  HttpError,
  success,
} from '../_frontend_shared/http.ts';
import { requestContext } from '../_frontend_shared/supabase.ts';
import {
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
    const query = (url.searchParams.get('q') ?? '').trim();
    if (query.length < 3 || query.length > 200)
      throw new HttpError(422, 'invalid_query', 'Search requires 3 to 200 characters');
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 5), 1), 10);
    const lat = Number(url.searchParams.get('lat') ?? 14.5995);
    const lon = Number(url.searchParams.get('lon') ?? 120.9842);
    const result = await cached(
      admin,
      'SEARCH',
      {
        query: query.toLowerCase(),
        limit,
        lat: Math.round(lat * 1000) / 1000,
        lon: Math.round(lon * 1000) / 1000,
      },
      86400,
      async () => {
        await enforceGeoRateLimit(admin, user.id);
        const params = new URLSearchParams({
          text: query,
          'boundary.country': 'PHL',
          size: String(limit),
          'focus.point.lat': String(lat),
          'focus.point.lon': String(lon),
        });
        const body = await ors(`/geocode/search?${params}`);
        return (body.features ?? [])
          .map(normalizeFeature)
          .filter(
            (item: Record<string, unknown>) =>
              Number(item.latitude) >= 4 &&
              Number(item.latitude) <= 22 &&
              Number(item.longitude) >= 116 &&
              Number(item.longitude) <= 127,
          );
      },
    );
    return success({
      items: result.value,
      cached: result.cached,
      attribution: '© OpenStreetMap contributors, OpenRouteService',
    });
  } catch (error) {
    return handleError(error);
  }
});
