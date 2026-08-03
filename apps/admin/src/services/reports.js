import { supabase, status, identity, accountName } from './adminShared';

export async function loadReports() {
  const labels = {
    FINANCIAL: 'Financial Summary',
    WORKERS: 'Worker Performance',
    CUSTOMERS: 'Customer Activity',
    SERVICES: 'Service Popularity',
    REVIEWS: 'Review Sentiment',
  };
  const { data, error } = await supabase
    .from('report_exports')
    .select(
      '*,requester:accounts!report_exports_requested_by_fkey(user_profiles(display_name),worker_profiles(display_name),admin_profiles(display_name))',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: `${status(row.report_type)} Report`,
    type: labels[row.report_type] ?? status(row.report_type),
    reportTypeCode: row.report_type,
    generatedBy: identity(accountName(row.requester), 'Report requester'),
    dateGenerated: new Date(row.created_at).toLocaleDateString(),
    size: row.storage_path ? String(row.parameters?.format ?? '') : '',
    status: status(row.status),
    storagePath: row.storage_path,
  }));
}

export async function generateReport(reportType = 'FINANCIAL', format = 'PDF') {
  const types = {
    FINANCIAL: 'transactions',
    WORKERS: 'workers',
    CUSTOMERS: 'users',
    SERVICES: 'bookings',
  };
  const backendType = types[reportType];
  if (!backendType) throw new Error('This report type is not supported by the backend');
  const { data, error } = await supabase.functions.invoke('report-export', {
    body: { reportType: backendType, format, filters: {} },
  });
  if (error) throw error;
  return data;
}

export async function downloadReport(path) {
  const { data, error } = await supabase.storage.from('report-exports').createSignedUrl(path, 60);
  if (error) throw error;
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}
