import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.57.4';

export type RequestContext = { client: SupabaseClient; admin: SupabaseClient; user: User };

export async function requestContext(request: Request): Promise<RequestContext> {
  const url = Deno.env.get('SUPABASE_URL');
  const publishableKey =
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');
  const secretKey =
    Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('authorization');
  if (!url || !publishableKey || !secretKey)
    throw new Error('Supabase function environment is incomplete');
  if (!authorization?.startsWith('Bearer ')) throw new Error('authentication_required');
  const client = createClient(url, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const admin = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !data.user) throw new Error('authentication_required');
  return { client, admin, user: data.user };
}

export async function requirePermission(client: SupabaseClient, permission: string) {
  const { data, error } = await client.rpc('has_permission', { required_permission: permission });
  if (error || !data) throw new Error('forbidden');
}
