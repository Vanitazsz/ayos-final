import {
  corsHeaders,
  corsHeadersFor,
  failure,
  handleError,
  HttpError,
  success,
} from '../_frontend_shared/http.ts';
import { requestContext } from '../_frontend_shared/supabase.ts';

type ApiDependencies = {
  requestContext: typeof requestContext;
};

function settingsPayload(value: unknown) {
  const payload = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const overrides = Array.isArray(payload.serviceCategoryOverrides)
    ? payload.serviceCategoryOverrides
    : [];
  return {
    platform: {
      commissionRate: Number(payload.commissionRate ?? 0),
      homeownerCharge: Number(payload.homeownerCharge ?? 0),
    },
    serviceCategoryOverrides: overrides,
  };
}

export async function handleApiRequest(
  request: Request,
  dependencies: ApiDependencies = { requestContext },
) {
  Object.assign(corsHeaders, corsHeadersFor(request));
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const pathname = new URL(request.url).pathname;
  if (pathname !== '/admin/settings' || request.method !== 'GET') {
    return failure(404, 'not_found', 'API route not found');
  }

  try {
    const { client } = await dependencies.requestContext(request);
    const { data: isAdmin, error: adminError } = await client.rpc('is_admin', {
      require_aal2: true,
    });
    if (adminError) throw adminError;
    if (!isAdmin) {
      throw new HttpError(403, 'aal2_admin_required', 'AAL2 administrator access required');
    }

    const { data, error } = await client.rpc('get_platform_fee_settings');
    if (error) throw error;
    return success(settingsPayload(data), 'Admin settings loaded');
  } catch (error) {
    return handleError(error);
  }
}

if (import.meta.main) Deno.serve((request) => handleApiRequest(request));
