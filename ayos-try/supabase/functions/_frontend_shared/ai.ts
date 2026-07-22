import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.57.4';
import { HttpError } from './http.ts';

export type MediaInput = {
  bucket: string;
  path: string;
  contentType: string;
  byteSize?: number;
  durationSeconds?: number;
};
export type AnalysisResult = {
  detectedIssue: string;
  possibleCauses: string[];
  suggestedCategoryIds: string[];
  suggestedServiceIds: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  urgency: 'ROUTINE' | 'SOON' | 'URGENT' | 'EMERGENCY';
  estimatedDurationMinutes: number;
  estimatedCostMinimumMinor: number;
  estimatedCostMaximumMinor: number;
  safetyAdvice: string[];
  followUpQuestions: string[];
  confidence: number;
  requestDraft: string;
  transcript: string;
  safetyCritical: boolean;
};

export type ProviderAttempt = {
  provider: 'GEMINI' | 'OPENAI';
  model: string;
  outcome: 'SUCCEEDED' | 'FAILED' | 'SKIPPED';
  retryable: boolean;
  latency_ms: number;
  error_code: string | null;
  http_status?: number;
  usage_metadata?: Record<string, unknown>;
  providerReference?: string;
};

const outputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    detectedIssue: { type: 'string' },
    possibleCauses: { type: 'array', items: { type: 'string' } },
    suggestedCategoryIds: { type: 'array', items: { type: 'string' } },
    suggestedServiceIds: { type: 'array', items: { type: 'string' } },
    severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    urgency: { type: 'string', enum: ['ROUTINE', 'SOON', 'URGENT', 'EMERGENCY'] },
    estimatedDurationMinutes: { type: 'integer', minimum: 5, maximum: 10080 },
    estimatedCostMinimumMinor: { type: 'integer', minimum: 0 },
    estimatedCostMaximumMinor: { type: 'integer', minimum: 0 },
    safetyAdvice: { type: 'array', items: { type: 'string' } },
    followUpQuestions: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    requestDraft: { type: 'string' },
    transcript: { type: 'string' },
    safetyCritical: { type: 'boolean' },
  },
  required: [
    'detectedIssue',
    'possibleCauses',
    'suggestedCategoryIds',
    'suggestedServiceIds',
    'severity',
    'urgency',
    'estimatedDurationMinutes',
    'estimatedCostMinimumMinor',
    'estimatedCostMaximumMinor',
    'safetyAdvice',
    'followUpQuestions',
    'confidence',
    'requestDraft',
    'transcript',
    'safetyCritical',
  ],
};

const prompt = (description: string, categories: unknown[], services: unknown[]) =>
  `You are an advisory triage assistant for a Philippine home-services marketplace. Analyze only the supplied customer description and media. Never fabricate certainty. Transcribe any supplied voice recording faithfully into transcript. Describe visible problems in supplied photos concisely and use that evidence in requestDraft. Costs are integer Philippine centavos (PHP minor units). IDs must be selected only from the live catalog supplied below. Electrical, gas, structural, hazardous-material, or emergency issues must set safetyCritical=true and include immediate safety advice. Do not authorize or book a worker.\n\nDescription: ${description.trim() || '[No written description was provided. Rely only on the supplied media.]'}\n\nLive categories: ${JSON.stringify(categories)}\nLive services: ${JSON.stringify(services)}`;

function retryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}
function asErrorCode(status: number) {
  return `PROVIDER_HTTP_${status}`;
}
function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function loadMedia(admin: SupabaseClient, accountId: string, media: MediaInput[]) {
  if (media.length > 4)
    throw new HttpError(
      422,
      'invalid_media',
      'At most three photos and one audio recording are allowed',
    );
  const images = media.filter((item) => item.contentType.startsWith('image/'));
  const audio = media.filter((item) => item.contentType.startsWith('audio/'));
  if (
    images.length > 3 ||
    audio.length > 1 ||
    audio.some((item) => (item.durationSeconds ?? 61) > 60)
  )
    throw new HttpError(422, 'invalid_media', 'Invalid photo or audio limits');
  const allowedBuckets = new Set(['service-request-media', 'request-media']);
  return await Promise.all(
    media.map(async (item) => {
      if (!allowedBuckets.has(item.bucket) || item.path.split('/')[0] !== accountId)
        throw new HttpError(403, 'invalid_media_owner', 'Media ownership validation failed');
      if (!/^(image\/(jpeg|png|webp)|audio\/(mpeg|mp4|m4a|wav|webm))$/.test(item.contentType))
        throw new HttpError(422, 'invalid_media_type', 'Unsupported media type');
      const { data, error } = await admin.storage.from(item.bucket).download(item.path);
      if (error || !data) throw new HttpError(422, 'invalid_media', 'Media could not be read');
      const bytes = new Uint8Array(await data.arrayBuffer());
      if (bytes.byteLength > 15 * 1024 * 1024)
        throw new HttpError(422, 'media_too_large', 'Each media file must be 15 MB or smaller');
      return { ...item, bytes, base64: toBase64(bytes) };
    }),
  );
}

function validate(value: unknown): AnalysisResult {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('SCHEMA_VALIDATION_FAILED');
  const v = value as Record<string, unknown>;
  const arrays = [
    'possibleCauses',
    'suggestedCategoryIds',
    'suggestedServiceIds',
    'safetyAdvice',
    'followUpQuestions',
  ];
  if (
    typeof v.detectedIssue !== 'string' ||
    typeof v.requestDraft !== 'string' ||
    typeof v.transcript !== 'string' ||
    arrays.some((key) => !Array.isArray(v[key])) ||
    !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(String(v.severity)) ||
    !['ROUTINE', 'SOON', 'URGENT', 'EMERGENCY'].includes(String(v.urgency)) ||
    typeof v.safetyCritical !== 'boolean'
  )
    throw new Error('SCHEMA_VALIDATION_FAILED');
  for (const key of [
    'estimatedDurationMinutes',
    'estimatedCostMinimumMinor',
    'estimatedCostMaximumMinor',
    'confidence',
  ])
    if (typeof v[key] !== 'number' || !Number.isFinite(v[key] as number))
      throw new Error('SCHEMA_VALIDATION_FAILED');
  if (
    (v.estimatedCostMinimumMinor as number) < 0 ||
    (v.estimatedCostMaximumMinor as number) < (v.estimatedCostMinimumMinor as number) ||
    (v.confidence as number) < 0 ||
    (v.confidence as number) > 1
  )
    throw new Error('SCHEMA_VALIDATION_FAILED');
  return value as AnalysisResult;
}

async function callGemini(
  description: string,
  catalog: { categories: unknown[]; services: unknown[] },
  media: Awaited<ReturnType<typeof loadMedia>>,
) {
  const key = Deno.env.get('GEMINI_API_KEY');
  const model = Deno.env.get('GEMINI_MODEL');
  if (!key || !model) throw Object.assign(new Error('GEMINI_NOT_CONFIGURED'), { retryable: true });
  const parts: Record<string, unknown>[] = [
    { text: prompt(description, catalog.categories, catalog.services) },
  ];
  for (const item of media)
    parts.push({ inline_data: { mime_type: item.contentType, data: item.base64 } });
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    Number(Deno.env.get('AI_TIMEOUT_MS') ?? 45000),
  );
  const started = Date.now();
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: outputSchema,
            temperature: 0.2,
          },
        }),
        signal: controller.signal,
      },
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
      throw Object.assign(new Error(asErrorCode(response.status)), {
        status: response.status,
        retryable: retryableStatus(response.status),
        usage: body,
      });
    const finish = body?.candidates?.[0]?.finishReason;
    if (['SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT'].includes(finish))
      throw Object.assign(new Error('SAFETY_REJECTION'), { status: 422, retryable: false });
    const text = body?.candidates?.[0]?.content?.parts
      ?.map((part: Record<string, unknown>) => part.text ?? '')
      .join('');
    return {
      result: validate(JSON.parse(text)),
      latency: Date.now() - started,
      usage: body?.usageMetadata ?? {},
      reference: body?.responseId ?? null,
      model,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw Object.assign(new Error('PROVIDER_TIMEOUT'), { status: 408, retryable: true });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function transcribeOpenAI(item: Awaited<ReturnType<typeof loadMedia>>[number]) {
  const key = Deno.env.get('OPENAI_API_KEY');
  const model = Deno.env.get('OPENAI_TRANSCRIPTION_MODEL') ?? 'gpt-4o-mini-transcribe-2025-12-15';
  if (!key) throw Object.assign(new Error('OPENAI_NOT_CONFIGURED'), { retryable: true });
  const form = new FormData();
  form.append('model', model);
  form.append(
    'file',
    new Blob([item.bytes], { type: item.contentType }),
    `audio.${item.contentType.split('/')[1]}`,
  );
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}` },
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(new Error(asErrorCode(response.status)), {
      status: response.status,
      retryable: retryableStatus(response.status),
    });
  return String(body.text ?? '');
}

async function callOpenAI(
  description: string,
  catalog: { categories: unknown[]; services: unknown[] },
  media: Awaited<ReturnType<typeof loadMedia>>,
) {
  const key = Deno.env.get('OPENAI_API_KEY');
  const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-5.6-terra';
  if (!key) throw Object.assign(new Error('OPENAI_NOT_CONFIGURED'), { retryable: true });
  const audio = media.find((item) => item.contentType.startsWith('audio/'));
  const transcript = audio ? await transcribeOpenAI(audio) : '';
  const content: Record<string, unknown>[] = [
    {
      type: 'input_text',
      text: `${prompt(description, catalog.categories, catalog.services)}\nAudio transcript: ${transcript}`,
    },
  ];
  for (const item of media.filter((value) => value.contentType.startsWith('image/')))
    content.push({
      type: 'input_image',
      image_url: `data:${item.contentType};base64,${item.base64}`,
      detail: 'high',
    });
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    Number(Deno.env.get('AI_TIMEOUT_MS') ?? 45000),
  );
  const started = Date.now();
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        reasoning: { effort: 'none' },
        input: [{ role: 'user', content }],
        text: {
          format: {
            type: 'json_schema',
            name: 'service_request_analysis',
            strict: true,
            schema: outputSchema,
          },
        },
      }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
      throw Object.assign(new Error(asErrorCode(response.status)), {
        status: response.status,
        retryable: retryableStatus(response.status),
      });
    if (body?.status === 'incomplete' && body?.incomplete_details?.reason === 'content_filter')
      throw Object.assign(new Error('SAFETY_REJECTION'), { status: 422, retryable: false });
    const outputText =
      body.output_text ??
      body?.output
        ?.flatMap((o: Record<string, unknown>) => (Array.isArray(o.content) ? o.content : []))
        .find((c: Record<string, unknown>) => c.type === 'output_text')?.text;
    const result = validate(JSON.parse(String(outputText ?? '')));
    if (transcript && !result.transcript) result.transcript = transcript;
    return {
      result,
      latency: Date.now() - started,
      usage: body.usage ?? {},
      reference: body.id ?? null,
      model,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw Object.assign(new Error('PROVIDER_TIMEOUT'), { status: 408, retryable: true });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function runAnalysis(
  admin: SupabaseClient,
  accountId: string,
  description: string,
  mediaInput: MediaInput[],
) {
  const [
    { data: categories, error: categoryError },
    { data: services, error: serviceError },
    media,
  ] = await Promise.all([
    admin
      .from('service_categories')
      .select('id,name,minimum_price_minor,maximum_price_minor,is_safety_critical')
      .eq('is_active', true),
    admin
      .from('services')
      .select('id,category_id,name,minimum_price_minor,maximum_price_minor,is_safety_critical')
      .eq('is_active', true),
    loadMedia(admin, accountId, mediaInput),
  ]);
  if (categoryError || serviceError) throw new Error('CATALOG_UNAVAILABLE');
  const catalog = { categories: categories ?? [], services: services ?? [] };
  const attempts: ProviderAttempt[] = [];
  let lastError: unknown;
  for (let i = 0; i < 2; i++) {
    const started = Date.now();
    try {
      const output = await callGemini(description, catalog, media);
      attempts.push({
        provider: 'GEMINI',
        model: output.model,
        outcome: 'SUCCEEDED',
        retryable: false,
        latency_ms: output.latency,
        error_code: null,
        usage_metadata: output.usage,
        providerReference: output.reference,
      });
      return { ...output, provider: 'GEMINI' as const, attempts, media };
    } catch (error) {
      lastError = error;
      const value = error as Error & { retryable?: boolean; status?: number };
      attempts.push({
        provider: 'GEMINI',
        model: Deno.env.get('GEMINI_MODEL') ?? 'unconfigured',
        outcome: 'FAILED',
        retryable: Boolean(value.retryable),
        latency_ms: Date.now() - started,
        error_code: value.message,
        http_status: value.status,
      });
      if (!value.retryable) throw Object.assign(error as object, { attempts });
    }
  }
  const started = Date.now();
  try {
    const output = await callOpenAI(description, catalog, media);
    attempts.push({
      provider: 'OPENAI',
      model: output.model,
      outcome: 'SUCCEEDED',
      retryable: false,
      latency_ms: output.latency,
      error_code: null,
      usage_metadata: output.usage,
      providerReference: output.reference,
    });
    return { ...output, provider: 'OPENAI' as const, attempts, media };
  } catch (error) {
    const value = error as Error & { retryable?: boolean; status?: number };
    attempts.push({
      provider: 'OPENAI',
      model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-5.6-terra',
      outcome: 'FAILED',
      retryable: Boolean(value.retryable),
      latency_ms: Date.now() - started,
      error_code: value.message,
      http_status: value.status,
    });
    throw Object.assign(lastError instanceof Error ? lastError : new Error('AI_PROVIDERS_FAILED'), {
      attempts,
      retryable: true,
    });
  }
}

export async function validateCatalogAndCosts(admin: SupabaseClient, result: AnalysisResult) {
  const [{ data: categories }, { data: services }] = await Promise.all([
    admin
      .from('service_categories')
      .select('id,minimum_price_minor,maximum_price_minor,is_safety_critical')
      .in('id', result.suggestedCategoryIds),
    admin
      .from('services')
      .select('id,minimum_price_minor,maximum_price_minor,is_safety_critical')
      .in('id', result.suggestedServiceIds),
  ]);
  const categoryIds = new Set((categories ?? []).map((row) => row.id));
  const serviceIds = new Set((services ?? []).map((row) => row.id));
  result.suggestedCategoryIds = result.suggestedCategoryIds.filter((id) => categoryIds.has(id));
  result.suggestedServiceIds = result.suggestedServiceIds.filter((id) => serviceIds.has(id));
  const bounds = [...(categories ?? []), ...(services ?? [])];
  const minimum = Math.min(
    ...bounds
      .map((row) => row.minimum_price_minor)
      .filter((v): v is number => typeof v === 'number'),
  );
  const maximum = Math.max(
    ...bounds
      .map((row) => row.maximum_price_minor)
      .filter((v): v is number => typeof v === 'number'),
  );
  const costOutlier =
    Number.isFinite(minimum) &&
    Number.isFinite(maximum) &&
    (result.estimatedCostMinimumMinor < minimum || result.estimatedCostMaximumMinor > maximum);
  result.safetyCritical = result.safetyCritical || bounds.some((row) => row.is_safety_critical);
  return { result, costOutlier };
}
