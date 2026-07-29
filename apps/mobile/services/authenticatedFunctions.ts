import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

type FunctionInvokeOptions = NonNullable<
  Parameters<typeof supabase.functions.invoke>[1]
>;

const SESSION_EXPIRY_SKEW_SECONDS = 60;
let refreshPromise: Promise<Session | null> | null = null;

export class SessionExpiredError extends Error {
  constructor(message = 'Your session expired. Please sign in again.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

function expiresSoon(session: Session) {
  return (
    !session.expires_at ||
    session.expires_at <= Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SKEW_SECONDS
  );
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = supabase.auth
      .refreshSession()
      .then(({ data, error }) => {
        if (error) return null;
        return data.session;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function resolveSession(forceRefresh = false) {
  if (forceRefresh) return refreshSession();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  if (expiresSoon(data.session)) return refreshSession();
  return data.session;
}

async function isAuthenticationError(error: unknown) {
  const context = (error as { context?: Response })?.context;
  if (context?.status === 401) return true;
  if (!context) return false;
  try {
    const payload = await context.clone().json();
    return (
      payload?.code === 'authentication_required' ||
      payload?.error?.code === 'authentication_required'
    );
  } catch {
    return false;
  }
}

async function expireSession() {
  useAuthStore.getState().expireSession();
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Local app state is already cleared; a failed remote sign-out must not
    // leave protected screens accessible.
  }
}

async function requireSession(forceRefresh = false) {
  const session = await resolveSession(forceRefresh);
  if (session) return session;
  await expireSession();
  throw new SessionExpiredError();
}

export async function invokeAuthenticatedFunction<T>(
  functionName: string,
  options: FunctionInvokeOptions = {},
): Promise<T> {
  const invoke = (session: Session) =>
    supabase.functions.invoke(functionName, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${session.access_token}`,
      },
    });

  let result = await invoke(await requireSession());
  if (result.error && (await isAuthenticationError(result.error))) {
    result = await invoke(await requireSession(true));
  }

  if (result.error) {
    if (await isAuthenticationError(result.error)) {
      await expireSession();
      throw new SessionExpiredError();
    }
    throw result.error;
  }

  return result.data as T;
}

