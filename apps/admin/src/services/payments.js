import { supabase, status, identity } from './adminShared';

export async function loadPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select(
      'id,booking_id,service_amount,commission_amount,worker_net_amount,method,status,created_at,bookings(user_profiles:user_account_id(display_name),worker_profiles:worker_account_id(display_name))',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    bookingId: row.booking_id,
    customer: identity(row.bookings?.user_profiles?.display_name, 'Payment customer'),
    worker: identity(row.bookings?.worker_profiles?.display_name, 'Payment worker'),
    amount: Number(row.service_amount),
    fee: Number(row.commission_amount),
    net: Number(row.worker_net_amount),
    method: status(row.method),
    status: row.status === 'SUCCESSFUL' ? 'Completed' : status(row.status),
    type: 'Payment',
    date: new Date(row.created_at).toLocaleDateString(),
  }));
}
