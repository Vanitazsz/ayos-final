export const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'authorization, apikey, content-type, x-client-info, x-idempotency-key',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export function options(request: Request): Response | undefined {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return undefined;
}

export function unavailable(capability: string): Response {
  return json(
    {
      error: {
        code: 'PROVIDER_UNAVAILABLE',
        message: `${capability} is unavailable until a production provider is configured.`,
      },
    },
    503,
  );
}
