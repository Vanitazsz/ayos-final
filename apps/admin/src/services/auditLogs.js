import { supabase } from '../lib/supabase';

const status = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const accountName = (account) =>
  account?.user_profiles?.display_name ??
  account?.worker_profiles?.display_name ??
  account?.admin_profiles?.display_name ??
  null;

export async function loadAuditLogs() {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(
      '*,actor:accounts!audit_logs_actor_id_fkey(user_profiles(display_name),worker_profiles(display_name),admin_profiles(display_name))',
    )
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    timestamp: new Date(row.created_at).toLocaleString(),
    admin: accountName(row.actor) ?? '',
    action: status(row.action),
    module: row.entity_type ?? '',
    target: row.entity_id ?? '',
    status: row.metadata?.status ? status(row.metadata.status) : '',
    device: row.metadata?.device ?? '',
    browser: row.metadata?.browser ?? '',
    ip: row.metadata?.ip_address ?? '',
    metadata: row.metadata,
  }));
}
