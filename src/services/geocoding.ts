import {
  invokeAuthenticatedFunction,
  SessionExpiredError,
} from '@/services/authenticatedFunctions';
import {
  EdgeFunctionError,
  normalizeFunctionError,
} from '@/services/functionErrors';

export interface GeocodingResult {
  providerId: string;
  line: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  displayLabel: string;
  confidence: number | null;
  longitude: number;
  latitude: number;
  provider: 'OPENROUTESERVICE';
  raw?: Record<string, unknown>;
}

interface GeocodingSearchResponse {
  data?: { items?: GeocodingResult[] };
}

interface ReverseGeocodingResponse {
  data: { result: GeocodingResult };
}

function geocodingErrorMessage(error: EdgeFunctionError): string {
  if (error.code === 'geocoding_rate_limited')
    return 'Address search is temporarily busy. Wait a minute or enter the address manually.';
  if (error.code === 'outside_philippines')
    return 'Choose a service location within the Philippines.';
  if (error.code === 'authentication_required')
    return 'Your session expired. Sign in again to search for an address.';
  if (
    error.code === 'invalid_query' ||
    error.code === 'invalid_geocoding_request'
  )
    return 'That address could not be found. Check it or enter the address manually.';
  return 'The address provider is temporarily unavailable. Your map point is still usable.';
}

export async function geocodeSearch(
  query: string,
  coords?: { latitude: number; longitude: number },
): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({ q: query });
  if (coords) {
    params.set('lat', String(coords.latitude));
    params.set('lon', String(coords.longitude));
  }
  try {
    const data = await invokeAuthenticatedFunction<GeocodingSearchResponse>(
      `geocode-search?${params}`,
      { method: 'GET' },
    );
    return data.data?.items ?? [];
  } catch (error) {
    const normalized = await normalizeFunctionError(
      error,
      'Address search is unavailable.',
    );
    if (normalized instanceof SessionExpiredError) throw normalized;
    normalized.message = geocodingErrorMessage(normalized);
    throw normalized;
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeocodingResult> {
  try {
    const data = await invokeAuthenticatedFunction<ReverseGeocodingResponse>(
      `geocode-reverse?lat=${latitude}&lon=${longitude}`,
      { method: 'GET' },
    );
    return data.data.result;
  } catch (error) {
    const normalized = await normalizeFunctionError(
      error,
      'Address lookup is unavailable.',
    );
    if (normalized instanceof SessionExpiredError) throw normalized;
    normalized.message = geocodingErrorMessage(normalized);
    throw normalized;
  }
}
