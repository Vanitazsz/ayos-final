import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.57.4';
import {
  corsHeadersFor,
  failure,
  handleError,
  HttpError,
  jsonBody,
  success,
} from '../_frontend_shared/http.ts';
import { requestContext } from '../_frontend_shared/supabase.ts';
import {
  runAnalysis,
  validateCatalogAndCosts,
  type MediaInput,
  type ProviderAttempt,
} from '../_frontend_shared/ai.ts';

function responseFromAnalysis(row: Record<string, unknown>) {
  return {
    analysisId: row.id,
    inputType: row.input_type,
    transcript: row.transcript ?? '',
    problemDescription: row.detected_issue ?? '',
    requestDraft: row.request_draft ?? '',
    safetyAdvice: row.safety_advice ? [row.safety_advice] : [],
    provider: row.provider,
    model: row.provider_model,
  };
}

async function recordFailedAttempts(
  admin: SupabaseClient,
  accountId: string,
  idempotencyKey: string,
  correlationId: string,
  attempts: ProviderAttempt[],
) {
  if (!attempts.length) return;
  await admin.from('ai_analysis_attempts').upsert(
    attempts.map((attempt) => ({
      account_id: accountId,
      idempotency_key: idempotencyKey,
      provider: attempt.provider,
      model: attempt.model,
      outcome: attempt.outcome,
      retryable: attempt.retryable,
      latency_ms: attempt.latency_ms,
      error_code: attempt.error_code,
      correlation_id: correlationId,
      usage_metadata: attempt.usage_metadata ?? {},
      http_status: attempt.http_status,
    })),
    { onConflict: 'account_id,idempotency_key,provider,model,outcome' },
  );
}

Deno.serve(async (request) => {
  Object.assign((await import('../_frontend_shared/http.ts')).corsHeaders, corsHeadersFor(request));
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(request) });
  try {
    if (request.method !== 'POST') return failure(405, 'method_not_allowed', 'POST required');
    const { admin, user } = await requestContext(request);
    const body = await jsonBody(request);
    const media = body.media as MediaInput | undefined;
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const consent = body.consent as Record<string, unknown> | undefined;
    const idempotencyKey = request.headers.get('idempotency-key') ?? '';

    if (!media || typeof media !== 'object' || typeof media.contentType !== 'string')
      throw new HttpError(422, 'invalid_media', 'One photo or voice recording is required');
    if (description.length > 4000)
      throw new HttpError(422, 'invalid_description', 'Description is too long');
    if (idempotencyKey.length < 16 || idempotencyKey.length > 128)
      throw new HttpError(422, 'invalid_idempotency_key', 'A valid idempotency key is required');
    if (consent?.accepted !== true || typeof consent.version !== 'string')
      throw new HttpError(422, 'consent_required', 'AI processing requires explicit consent');

    const [{ data: account }, { data: settings }, { data: existing }] = await Promise.all([
      admin.from('accounts').select('status,deleted_at').eq('id', user.id).single(),
      admin
        .from('system_settings')
        .select('key,value')
        .in('key', ['ai.enabled', 'ai.per_user_daily_quota', 'ai.consent_version']),
      admin
        .from('ai_analyses')
        .select('*')
        .eq('account_id', user.id)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle(),
    ]);
    if (!account || account.status !== 'ACTIVE' || account.deleted_at)
      throw new HttpError(403, 'account_unavailable', 'Account is not active');

    const settingMap = Object.fromEntries((settings ?? []).map((row) => [row.key, row.value]));
    if (settingMap['ai.enabled'] !== true)
      throw new HttpError(503, 'ai_disabled', 'AI assistance is currently disabled');
    if (consent.version !== settingMap['ai.consent_version'])
      throw new HttpError(422, 'consent_version_invalid', 'Review the updated AI consent notice');
    if (existing)
      return success(responseFromAnalysis(existing), 'Existing media analysis returned');

    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await admin
      .from('ai_analyses')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', user.id)
      .gte('created_at', since);
    if ((count ?? 0) >= Number(settingMap['ai.per_user_daily_quota'] ?? 20))
      throw new HttpError(429, 'ai_quota_exceeded', 'Daily AI quota reached');

    const correlationId = crypto.randomUUID();
    const { error: consentError } = await admin.from('ai_processing_consents').insert({
      account_id: user.id,
      consent_version: consent.version,
      providers: ['OPENROUTER', 'GEMINI', 'OPENAI'],
      media_processing: true,
      request_correlation_id: correlationId,
    });
    if (consentError) throw consentError;

    try {
      const output = await runAnalysis(admin, user.id, description, [media]);
      const checked = await validateCatalogAndCosts(admin, output.result);
      const inputType = media.contentType.startsWith('audio/') ? 'VOICE' : 'IMAGE';
      const persistResult = {
        detectedIssue: checked.result.detectedIssue,
        severity: checked.result.severity,
        possibleCause: checked.result.possibleCauses.join('; '),
        suggestedCategory: checked.result.suggestedCategoryIds[0] ?? '',
        estimatedCostMinimum: checked.result.estimatedCostMinimumMinor / 100,
        estimatedCostMaximum: checked.result.estimatedCostMaximumMinor / 100,
        safetyAdvice: checked.result.safetyAdvice.join('\n'),
        requestDraft: checked.result.requestDraft,
      };
      const { data: analysis, error } = await admin.rpc('persist_ai_analysis', {
        p_account_id: user.id,
        p_input_type: inputType,
        p_input_storage_path: media.path,
        p_transcript: checked.result.transcript || null,
        p_idempotency_key: idempotencyKey,
        p_provider: output.provider,
        p_model: output.model,
        p_provider_reference: output.reference,
        p_result: persistResult,
        p_attempts: output.attempts,
      });
      if (error || !analysis) throw error ?? new Error('AI_RESULT_NOT_PERSISTED');
      return success(
        {
          ...responseFromAnalysis(analysis),
          transcript: checked.result.transcript,
          problemDescription: checked.result.detectedIssue,
          requestDraft: checked.result.requestDraft,
          safetyAdvice: checked.result.safetyAdvice,
          retryable: false,
        },
        'Media assistance completed',
      );
    } catch (providerError) {
      const value = providerError as Error & {
        attempts?: ProviderAttempt[];
        retryable?: boolean;
      };
      await recordFailedAttempts(
        admin,
        user.id,
        idempotencyKey,
        correlationId,
        value.attempts ?? [],
      );
      throw new HttpError(
        value.retryable ? 503 : 422,
        value.retryable ? 'ai_provider_unavailable' : 'ai_media_rejected',
        value.retryable
          ? 'AI assistance is temporarily unavailable'
          : 'The media could not be analyzed',
      );
    }
  } catch (error) {
    return handleError(error);
  }
});
