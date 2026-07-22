import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

if (existsSync('.env.local')) loadEnvFile('.env.local');

const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const secret = process.env.SUPABASE_SECRET_KEY;
const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'A-YOS Administrator';

if (!url || !secret || !email || !password || password.length < 12) {
  throw new Error(
    'Supabase URL/secret and valid bootstrap administrator credentials are required.',
  );
}

const headers = {
  apikey: secret,
  authorization: `Bearer ${secret}`,
  'content-type': 'application/json',
};

type BootstrapStatus = {
  auth_user_id: string | null;
  auth_user_exists: boolean;
  account_exists: boolean;
  admin_profile_exists: boolean;
  app_role: string | null;
  account_is_admin: boolean;
  account_is_active: boolean;
  account_is_protected: boolean;
  bootstrap_token_present: boolean;
  fully_bootstrapped: boolean;
};

type ApiError = { code?: string; error_code?: string; message?: string; msg?: string };

function safeError(body: ApiError, fallback: string) {
  const code = body.code ?? body.error_code;
  const message = body.message ?? body.msg;
  return [fallback, code, message].filter(Boolean).join(': ');
}

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(safeError(error, `${name} failed (${response.status})`));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function status(): Promise<BootstrapStatus> {
  return rpc<BootstrapStatus>('admin_bootstrap_status', { email });
}

async function clearBootstrapMetadata(userId: string) {
  const response = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      app_metadata: { ayos_role: 'ADMIN' },
      user_metadata: { name, admin_bootstrap_token: null },
    }),
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(safeError(error, `Administrator metadata cleanup failed (${response.status})`));
  }
}

const initialStatus = await status();
if (initialStatus.fully_bootstrapped) {
  console.info(`Protected administrator already bootstrapped for ${email}.`);
  process.exit(0);
}
if (initialStatus.auth_user_exists || initialStatus.account_exists) {
  const recoverableProtectedAdmin =
    initialStatus.auth_user_id &&
    initialStatus.account_is_admin &&
    initialStatus.account_is_active &&
    initialStatus.account_is_protected &&
    initialStatus.admin_profile_exists &&
    initialStatus.app_role === 'ADMIN';
  if (!recoverableProtectedAdmin) {
    throw new Error(
      'Administrator bootstrap stopped because an incomplete or conflicting account already exists.',
    );
  }
  await clearBootstrapMetadata(initialStatus.auth_user_id!);
  const recoveredStatus = await status();
  if (!recoveredStatus.fully_bootstrapped) {
    throw new Error('Existing administrator metadata cleanup verification failed.');
  }
  console.info(`Protected administrator already bootstrapped for ${email}.`);
  process.exit(0);
}

const bootstrapToken = randomBytes(32).toString('base64url');
const tokenHash = createHash('sha256').update(bootstrapToken).digest('hex');
const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

await rpc<void>('prepare_admin_bootstrap', {
  email,
  token_hash: tokenHash,
  display_name: name,
  expires_at: expiresAt,
});

let createdUserId: string | undefined;
try {
  const response = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      app_metadata: { ayos_role: 'ADMIN' },
      user_metadata: { name, admin_bootstrap_token: bootstrapToken },
    }),
  });
  const body = (await response.json().catch(() => ({}))) as ApiError & {
    id?: string;
    user?: { id?: string };
  };
  if (!response.ok) {
    throw new Error(safeError(body, `Administrator creation failed (${response.status})`));
  }
  createdUserId = body.id ?? body.user?.id;
  if (!createdUserId) throw new Error('Administrator creation returned no user identifier.');

  await clearBootstrapMetadata(createdUserId);
} catch (error) {
  await rpc<void>('cancel_admin_bootstrap', { email, token_hash: tokenHash }).catch(
    () => undefined,
  );
  throw error;
}

const finalStatus = await status();
if (!finalStatus.fully_bootstrapped || finalStatus.auth_user_id !== createdUserId) {
  throw new Error('Administrator bootstrap verification failed.');
}

console.info(`Protected administrator bootstrapped for ${email}.`);
