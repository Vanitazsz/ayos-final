import { supabase, status } from './adminShared';

export async function loadNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('id,title,body,audience,status,created_at,notification_deliveries(status,read_at)')
    .not('audience', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const deliveries = row.notification_deliveries ?? [];
    const read = deliveries.filter((item) => item.read_at).length;
    return {
      id: row.id,
      title: row.title,
      message: row.body,
      audience: status(row.audience),
      type: 'In App',
      status: status(row.status),
      date: new Date(row.created_at).toLocaleDateString(),
      openRate: deliveries.length ? `${Math.round((read / deliveries.length) * 100)}%` : '0%',
    };
  });
}

export async function createCampaign(input) {
  const { data, error } = await supabase.rpc('admin_create_notification_draft', {
    p_title: input.title,
    p_body: input.message,
    p_audience: input.audience,
    p_category: 'GENERAL',
  });
  if (error) throw error;
  return data;
}

export async function deleteCampaign(id) {
  const { error } = await supabase.rpc('admin_archive_notification', { p_notification_id: id });
  if (error) throw error;
}

export async function publishCampaign(id) {
  const { data, error } = await supabase.rpc('admin_publish_campaign', { p_campaign_id: id });
  if (error) throw error;
  return data;
}
