import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import {
  cached,
  classifyGeocodingProviderError,
  coalesceGeocodingRequest,
  ors,
} from './geocoding.ts';
import { HttpError } from './http.ts';

Deno.test('coalesces concurrent geocoding provider requests by cache key', async () => {
  let calls = 0;
  let resolveLoad: ((value: string) => void) | undefined;
  const load = () => {
    calls += 1;
    return new Promise<string>((resolve) => {
      resolveLoad = resolve;
    });
  };

  const first = coalesceGeocodingRequest('same-location', load);
  const second = coalesceGeocodingRequest('same-location', load);
  assertEquals(calls, 1);

  resolveLoad?.('result');
  assertEquals(await Promise.all([first, second]), ['result', 'result']);
});

Deno.test('releases a failed geocoding request so a later call can retry', async () => {
  let calls = 0;
  const load = () => {
    calls += 1;
    return Promise.reject(new Error('temporary failure'));
  };

  await assertRejects(() => coalesceGeocodingRequest('retryable', load));
  await assertRejects(() => coalesceGeocodingRequest('retryable', load));
  assertEquals(calls, 2);
});

Deno.test('classifies provider authentication and availability failures', () => {
  const unauthorized = classifyGeocodingProviderError(401);
  const forbidden = classifyGeocodingProviderError(403);
  const rateLimited = classifyGeocodingProviderError(429);
  const unavailable = classifyGeocodingProviderError(503);

  assertEquals(unauthorized instanceof HttpError, true);
  assertEquals(unauthorized.status, 503);
  assertEquals(unauthorized.code, 'geocoding_unauthorized');
  assertEquals(forbidden.code, 'geocoding_unauthorized');
  assertEquals(rateLimited.status, 429);
  assertEquals(rateLimited.code, 'geocoding_rate_limited');
  assertEquals(unavailable.status, 503);
  assertEquals(unavailable.code, 'geocoding_unavailable');
});

Deno.test('reports missing provider configuration without making a request', async () => {
  const previous = Deno.env.get('OPENROUTESERVICE_API_KEY');
  Deno.env.delete('OPENROUTESERVICE_API_KEY');
  try {
    await assertRejects(
      () => ors('/geocode/search'),
      HttpError,
      'OpenRouteService is not configured',
    );
  } finally {
    if (previous) Deno.env.set('OPENROUTESERVICE_API_KEY', previous);
  }
});

Deno.test('coalesces cache persistence as well as provider work', async () => {
  let upserts = 0;
  let loads = 0;
  let resolveLoad: ((value: { ok: boolean }) => void) | undefined;
  const query = {
    select: () => query,
    eq: () => query,
    gt: () => query,
    maybeSingle: () => Promise.resolve({ data: null }),
    upsert: () => {
      upserts += 1;
      return Promise.resolve({ error: null });
    },
  };
  const admin = { from: () => query };
  const load = () => {
    loads += 1;
    return new Promise<{ ok: boolean }>((resolve) => {
      resolveLoad = resolve;
    });
  };

  const first = cached(admin as never, 'SEARCH', { q: 'same' }, 60, load);
  const second = cached(admin as never, 'SEARCH', { q: 'same' }, 60, load);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assertEquals(loads, 1);

  resolveLoad?.({ ok: true });
  await Promise.all([first, second]);
  assertEquals(upserts, 1);
});
