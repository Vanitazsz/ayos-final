import {
  corsHeadersFor,
  failure,
  handleError,
  HttpError,
  jsonBody,
  success,
} from '../_frontend_shared/http.ts';
import { requestContext } from '../_frontend_shared/supabase.ts';
import { generateJson } from '../_frontend_shared/generative-json.ts';

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: { translated: { type: 'string' } },
  required: ['translated'],
};

Deno.serve(async (request) => {
  Object.assign((await import('../_frontend_shared/http.ts')).corsHeaders, corsHeadersFor(request));
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(request) });
  try {
    if (request.method !== 'POST') return failure(405, 'method_not_allowed', 'POST required');
    const { client, admin, user } = await requestContext(request);
    const body = await jsonBody(request);
    const messageId = typeof body.messageId === 'string' ? body.messageId : '';
    const targetLocale =
      body.targetLocale === 'fil' ? 'fil' : body.targetLocale === 'en' ? 'en' : '';
    if (!messageId || !targetLocale)
      throw new HttpError(422, 'invalid_translation', 'messageId and targetLocale are required');
    const { data: message, error } = await client
      .from('messages')
      .select('id,conversation_id,sender_id,body,original_locale')
      .eq('id', messageId)
      .single();
    if (error || !message || message.sender_id !== user.id)
      throw new HttpError(403, 'forbidden', 'Only the sender can request this translation');
    const sourceLocale = String(message.original_locale ?? '')
      .toLowerCase()
      .startsWith('fil')
      ? 'fil'
      : 'en';
    if (sourceLocale === targetLocale) return success({ skipped: true }, 'Translation not needed');
    const targetName = targetLocale === 'fil' ? 'natural Filipino/Tagalog' : 'natural English';
    const generated = await generateJson(
      `Translate this private marketplace chat message into ${targetName}. Preserve names, numbers, prices, and meaning. Return only the translated text in JSON. Message: ${JSON.stringify(message.body)}`,
      schema,
    );
    const translated = String(generated.data.translated ?? '').trim();
    if (!translated)
      throw new HttpError(502, 'empty_translation', 'Translation provider returned empty text');
    const { data, error: insertError } = await admin
      .from('message_translations')
      .upsert(
        {
          message_id: message.id,
          target_locale: targetLocale,
          translated,
          provider: generated.provider,
        },
        { onConflict: 'message_id,target_locale' },
      )
      .select()
      .single();
    if (insertError) throw insertError;
    return success(data, 'Message translated');
  } catch (error) {
    return handleError(error);
  }
});
