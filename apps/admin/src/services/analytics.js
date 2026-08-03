import { supabase } from './adminShared';

export async function loadAnalytics() {
  const [
    { data: payments, error: paymentError },
    { data: requests, error: requestError },
    { data: accounts, error: accountError },
    { data: bookings, error: bookingError },
  ] = await Promise.all([
    supabase
      .from('payments')
      .select('service_amount,successful_at')
      .eq('status', 'SUCCESSFUL')
      .not('successful_at', 'is', null),
    supabase.from('service_requests').select('category_id,service_categories(name)'),
    supabase.from('accounts').select('id,created_at').eq('role', 'USER'),
    supabase.from('bookings').select('user_account_id,status,agreed_service_amount'),
  ]);
  if (paymentError) throw paymentError;
  if (requestError) throw requestError;
  if (accountError) throw accountError;
  if (bookingError) throw bookingError;
  return {
    payments: payments ?? [],
    requests: requests ?? [],
    accounts: accounts ?? [],
    bookings: bookings ?? [],
  };
}

export async function loadWorkerEarnings() {
  const { data, error } = await supabase
    .from('payments')
    .select('worker_net_amount,bookings(worker_account_id)')
    .eq('status', 'SUCCESSFUL')
    .not('worker_net_amount', 'is', null);
  if (error) throw error;
  const earningsByWorker = new Map();
  for (const row of data ?? []) {
    const workerId = row.bookings?.worker_account_id;
    if (workerId) {
      earningsByWorker.set(
        workerId,
        (earningsByWorker.get(workerId) ?? 0) + Number(row.worker_net_amount),
      );
    }
  }
  return {
    totalEarnings: [...earningsByWorker.values()].reduce((s, v) => s + v, 0),
    workerCount: earningsByWorker.size,
  };
}
