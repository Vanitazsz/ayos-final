import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.57.4';
import { HttpError } from './http.ts';

const inFlightRequests = new Map<string, Promise<unknown>>();

export function coalesceGeocodingRequest<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) return existing as Promise<T>;
  const pending = load().finally(() => {
    if (inFlightRequests.get(key) === pending) inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, pending);
  return pending;
}

export function classifyGeocodingProviderError(status: number) {
  if (status === 401 || status === 403)
    return new HttpError(503, 'geocoding_unauthorized', 'Geocoding provider credentials rejected');
  if (status === 429)
    return new HttpError(429, 'geocoding_rate_limited', 'Geocoding provider rate limit reached');
  if (status >= 500)
    return new HttpError(503, 'geocoding_unavailable', 'Geocoding provider unavailable');
  return new HttpError(422, 'invalid_geocoding_request', 'Geocoding request was rejected');
}

export async function enforceGeoRateLimit(admin: SupabaseClient, userId: string) {
  const since = new Date(Date.now() - 60000).toISOString();
  const { count } = await admin
    .from('audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('actor_id', userId)
    .eq('action', 'GEOCODING_REQUEST')
    .gte('created_at', since);
  if ((count ?? 0) >= 30)
    throw new HttpError(429, 'geocoding_rate_limited', 'Too many geocoding requests');
  await admin
    .from('audit_logs')
    .insert({ actor_id: userId, action: 'GEOCODING_REQUEST', entity_type: 'geocoding' });
}
async function hash(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
export async function cached<T>(
  admin: SupabaseClient,
  operation: 'SEARCH' | 'REVERSE' | 'ROUTE',
  request: unknown,
  ttlSeconds: number,
  load: () => Promise<T>,
) {
  const normalized = JSON.stringify(request);
  const key = await hash(`${operation}:${normalized}`);
  const { data } = await admin
    .from('geocoding_cache')
    .select('normalized_response')
    .eq('cache_key', key)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (data) return { value: data.normalized_response as T, cached: true };
  return await coalesceGeocodingRequest(key, async () => {
    const value = await load();
    await admin.from('geocoding_cache').upsert({
      cache_key: key,
      operation,
      normalized_request: request,
      normalized_response: value,
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    });
    return { value, cached: false };
  });
}
export async function ors(path: string, init?: RequestInit) {
  const key = Deno.env.get('OPENROUTESERVICE_API_KEY');
  if (!key) throw new HttpError(503, 'geocoding_unavailable', 'OpenRouteService is not configured');
  const headers = new Headers(init?.headers);
  headers.set('authorization', key);
  headers.set('accept', 'application/json');
  if (init?.body) headers.set('content-type', 'application/json');
  const response = await fetch(`https://api.openrouteservice.org${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const providerMessage = await response.text().catch(() => '');
    console.error('OpenRouteService request failed', {
      status: response.status,
      endpoint: path.split('?')[0],
      providerMessage: providerMessage.slice(0, 500),
    });
    throw classifyGeocodingProviderError(response.status);
  }
  return await response.json();
}
function text(properties: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}
export function normalizeFeature(feature: Record<string, unknown>) {
  const properties = (feature.properties ?? {}) as Record<string, unknown>;
  const geometry = (feature.geometry ?? {}) as Record<string, unknown>;
  const coordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
  return {
    providerId: String(properties.id ?? properties.gid ?? ''),
    line: text(properties, 'name', 'street'),
    barangay: text(properties, 'localadmin', 'neighbourhood', 'borough'),
    city: text(properties, 'locality', 'county', 'region'),
    province: text(properties, 'region', 'county'),
    postalCode: text(properties, 'postalcode'),
    displayLabel: text(properties, 'label', 'name'),
    confidence: typeof properties.confidence === 'number' ? properties.confidence : null,
    longitude: Number(coordinates[0]),
    latitude: Number(coordinates[1]),
    provider: 'OPENROUTESERVICE',
    raw: feature,
  };
}
export function assertPhilippines(latitude: number, longitude: number) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < 4 ||
    latitude > 22 ||
    longitude < 116 ||
    longitude > 127
  )
    throw new HttpError(422, 'outside_philippines', 'Coordinates must be within the Philippines');
}
