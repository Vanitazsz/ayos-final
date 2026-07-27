import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.110.7';

interface Account {
  id: string;
  role: 'USER' | 'WORKER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  mfa_enabled: boolean;
}

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function adminClient(): SupabaseClient {
  return createClient(required('SUPABASE_URL'), required('SUPABASE_SECRET_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireAccount(request: Request, role?: Account['role'], aal2 = false) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('UNAUTHENTICATED');
  const client = createClient(required('SUPABASE_URL'), required('SUPABASE_PUBLISHABLE_KEY'), {
    global: { headers: { authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(authorization.slice(7));
  if (userError || !user) throw new Error('UNAUTHENTICATED');
  const { data, error } = await client
    .from('accounts')
    .select('id,role,status,mfa_enabled')
    .eq('id', user.id)
    .single();
  const { data: activeRole, error: roleError } = await client.rpc('current_role');
  if (error || roleError || !data || data.status !== 'ACTIVE' || (role && activeRole !== role))
    throw new Error('FORBIDDEN');
  data.role = activeRole as Account['role'];
  if (aal2 && data.mfa_enabled) {
    const { data: assurance, error: assuranceError } =
      await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance?.currentLevel !== 'aal2') throw new Error('MFA_REQUIRED');
  }
  return { client, account: data as Account, user };
}
