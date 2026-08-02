import { supabase, status } from './adminShared';

export async function loadDashboard() {
  const [
    { data: metrics, error: metricError },
    { data: logs, error: logError },
    { data: payments },
    { data: bookings },
  ] = await Promise.all([
    supabase.rpc('admin_dashboard_metrics'),
    supabase
      .from('audit_logs')
      .select('id,action,entity_type,created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('payments')
      .select('service_amount,commission_amount,successful_at')
      .eq('status', 'SUCCESSFUL')
      .order('successful_at'),
    supabase
      .from('bookings')
      .select('status,created_at')
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
  ]);
  if (metricError) throw metricError;
  if (logError) throw logError;
  return {
    metrics: metrics ?? {},
    activities: (logs ?? []).map((row) => ({
      id: row.id,
      user: row.entity_type ?? '',
      action: status(row.action),
      time: new Date(row.created_at).toLocaleString(),
      type: row.entity_type ?? '',
    })),
    payments: payments ?? [],
    bookings: bookings ?? [],
  };
}
