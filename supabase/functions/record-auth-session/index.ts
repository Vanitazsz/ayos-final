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

type RecordAuthSessionDependencies = {
  requireAccount: typeof requireAccount;
  adminClient: typeof adminClient;
};

export async function handleRecordAuthSession(
  request: Request,
  dependencies: RecordAuthSessionDependencies = {
    requireAccount,
    adminClient,
  },
) {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== 'POST')
    return json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST required.' } }, 405);
  try {
    const { user } = await dependencies.requireAccount(request);
    const admin = dependencies.adminClient();
    const authorization = request.headers.get('authorization') ?? '';
    const sessionHash = await sha256(sessionId(authorization));
    if (!sessionHash)
      return json({
        success: true,
        message: 'Session has no stable identifier; no duplicate-prone event was written.',
        created: false,
        duplicate: false,
        data: null,
      });
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const ipAddress = forwarded || request.headers.get('cf-connecting-ip') || null;
    const userAgent = request.headers.get('user-agent')?.slice(0, 1000) || null;

    const { data, error } = await admin.rpc('record_auth_session_event', {
      p_account_id: user.id,
      p_session_id_hash: sessionHash,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });
    if (error) throw error;
    const duplicate = data?.duplicate === true;
    return json({
      success: true,
      message: duplicate
        ? 'Authentication session already recorded.'
        : 'Authentication session recorded.',
      duplicate,
      created: !duplicate,
      data: data?.event ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Authentication session could not be recorded.';
    const status = message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 500;
    return json({ success: false, message, errors: {} }, status);
  }
}

if (import.meta.main) Deno.serve((request) => handleRecordAuthSession(request));
