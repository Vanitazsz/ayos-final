import { adminClient, requireAccount } from '../_shared/auth.ts';
import { json, options } from '../_shared/http.ts';

function sessionId(authorization: string): string | null {
  const payload = authorization.replace(/^Bearer\s+/i, '').split('.')[1];
  if (!payload) return null;
  try {
    const normalized = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(normalized)) as Record<string, unknown>;
    return typeof decoded.session_id === 'string' ? decoded.session_id : null;
  } catch {
    return null;
  }
}

async function sha256(value: string | null): Promise<string | null> {
  if (!value) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== 'POST')
    return json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST required.' } }, 405);
  try {
    const { user } = await requireAccount(request);
    const admin = adminClient();
    const authorization = request.headers.get('authorization') ?? '';
    const sessionHash = await sha256(sessionId(authorization));
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const ipAddress = forwarded || request.headers.get('cf-connecting-ip') || null;
    const userAgent = request.headers.get('user-agent')?.slice(0, 1000) || null;
    const since = new Date(Date.now() - 5 * 60_000).toISOString();

    let existingQuery = admin
      .from('authentication_events')
      .select('*')
      .eq('account_id', user.id)
      .eq('event_type', 'SIGNED_IN')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1);
    if (sessionHash) existingQuery = existingQuery.eq('session_id_hash', sessionHash);
    const { data: existing, error: existingError } = await existingQuery.maybeSingle();
    if (existingError) throw existingError;
    if (existing)
      return json({
        success: true,
        message: 'Authentication session already recorded.',
        data: existing,
      });

    const { data, error } = await admin
      .from('authentication_events')
      .insert({
        account_id: user.id,
        event_type: 'SIGNED_IN',
        session_id_hash: sessionHash,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single();
    if (error) throw error;
    return json({ success: true, message: 'Authentication session recorded.', data }, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Authentication session could not be recorded.';
    const status = message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 500;
    return json({ success: false, message, errors: {} }, status);
  }
});
