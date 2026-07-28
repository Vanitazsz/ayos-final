import {
  corsHeadersFor,
  failure,
  handleError,
  HttpError,
  jsonBody,
  success,
} from '../_frontend_shared/http.ts';
import { requestContext } from '../_frontend_shared/supabase.ts';
import type { MediaInput } from '../_frontend_shared/ai.ts';

Deno.serve(async (request) => {
  Object.assign((await import('../_frontend_shared/http.ts')).corsHeaders, corsHeadersFor(request));
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(request) });
  try {
    if (request.method !== 'POST') return failure(405, 'method_not_allowed', 'POST required');
    const { admin, user } = await requestContext(request);
    const body = await jsonBody(request);
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const consent = body.consent as Record<string, unknown> | undefined;
    const media = Array.isArray(body.media) ? (body.media as MediaInput[]) : [];
    const idempotency = request.headers.get('idempotency-key') ?? String(body.idempotencyKey ?? '');
    if ((description.length < 10 && media.length === 0) || description.length > 4000)
      throw new HttpError(
        422,
        'invalid_description',
        'Provide a 10 to 4000 character description or attach valid media',
      );
    if (idempotency.length < 16 || idempotency.length > 128)
      throw new HttpError(
        422,
        'invalid_idempotency_key',
        'A 16 to 128 character idempotency key is required',
      );
    if (consent?.accepted !== true || typeof consent.version !== 'string')
      throw new HttpError(
        422,
        'consent_required',
        'AI processing requires explicit per-request consent',
      );
    const { data: account } = await admin
      .from('accounts')
      .select('status,deleted_at')
      .eq('id', user.id)
      .single();
    if (!account || account.status !== 'ACTIVE' || account.deleted_at)
      throw new HttpError(403, 'account_unavailable', 'Account is not active');
    const { data: settings } = await admin
      .from('system_settings')
      .select('key,value')
      .in('key', ['ai.enabled', 'ai.per_user_daily_quota', 'ai.consent_version']);
    const map = Object.fromEntries((settings ?? []).map((row) => [row.key, row.value]));
    if (map['ai.enabled'] !== true)
      throw new HttpError(
        503,
        'ai_disabled',
        'AI analysis is currently disabled; continue manually',
      );
    if (consent.version !== map['ai.consent_version'])
      throw new HttpError(
        422,
        'consent_version_invalid',
        'The consent notice has changed; review it again',
      );
    const since = new Date(Date.now() - 86400000).toISOString();
    const { count } = await admin
      .from('ai_analysis_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', user.id)
      .gte('created_at', since);
    if ((count ?? 0) >= Number(map['ai.per_user_daily_quota'] ?? 20))
      throw new HttpError(429, 'ai_quota_exceeded', 'Daily AI quota reached; continue manually');
    const { data: existing } = await admin
      .from('ai_analysis_jobs')
      .select('*')
      .eq('account_id', user.id)
      .eq('idempotency_key', idempotency)
      .maybeSingle();
    if (existing) return success(existing, 'Existing AI job returned', 200);
    const correlationId = crypto.randomUUID();
    const { data: consentRow, error: consentError } = await admin
      .from('ai_processing_consents')
      .insert({
        account_id: user.id,
        consent_version: consent.version,
        providers: ['OPENROUTER', 'GEMINI', 'OPENAI'],
        media_processing: media.length > 0,
        request_correlation_id: correlationId,
      })
      .select()
      .single();
    if (consentError) throw consentError;
    const { data: job, error } = await admin
      .from('ai_analysis_jobs')
      .insert({
        account_id: user.id,
        consent_id: consentRow.id,
        idempotency_key: idempotency,
        description,
        media_paths: media,
        input_locale: typeof body.locale === 'string' ? body.locale : null,
        correlation_id: correlationId,
      })
      .select()
      .single();
    if (error) throw error;
    return success(job, 'AI analysis queued', 202);
  } catch (error) {
    return handleError(error);
  }
});
