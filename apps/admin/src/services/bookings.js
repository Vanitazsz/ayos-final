import { supabase, status, identity } from './adminShared';

export async function loadBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id,service_request_id,status,version,created_at,agreed_service_amount,user_profiles:user_account_id(display_name),worker_profiles:worker_account_id(display_name),service_requests(description,scheduled_at,addresses(line1,barangay,city),service_categories(name),match_candidates(worker_id,score,eligible,worker_profiles:worker_id(display_name))),payments(method,status,service_amount,homeowner_platform_charge,refunds(status,reason)),cancellations(reason,fee_amount,refund_amount,resolution_status),booking_status_events(from_status,to_status,reason,created_at)',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    requestId: row.service_request_id,
    version: row.version,
    customer: identity(row.user_profiles?.display_name, 'Booking customer'),
    worker: row.worker_profiles?.display_name ?? '',
    service: identity(row.service_requests?.description, 'Booking request'),
    category: identity(row.service_requests?.service_categories?.name, 'Booking category'),
    address: [
      row.service_requests?.addresses?.line1,
      row.service_requests?.addresses?.barangay,
      row.service_requests?.addresses?.city,
    ]
      .filter(Boolean)
      .join(', '),
    date: new Date(row.service_requests?.scheduled_at ?? row.created_at).toLocaleDateString(),
    schedule: new Date(row.service_requests?.scheduled_at ?? row.created_at).toLocaleTimeString(),
    duration: '',
    price: row.agreed_service_amount == null ? null : Number(row.agreed_service_amount),
    payment: status(row.payments?.[0]?.method),
    status: status(row.status),
    events: (row.booking_status_events ?? []).sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    ),
    cancellation: row.cancellations?.[0] ?? null,
    refund: row.payments?.[0]?.refunds?.[0] ?? null,
    candidates: (row.service_requests?.match_candidates ?? [])
      .filter((item) => item.eligible)
      .sort((a, b) => Number(b.score) - Number(a.score))
      .map((item) => ({
        id: item.worker_id,
        name: item.worker_profiles?.display_name ?? item.worker_id,
        score: Number(item.score),
      })),
  }));
}

export async function cancelBookingAsAdmin(id, reason) {
  const { data, error } = await supabase.rpc('admin_cancel_booking', {
    p_booking_id: id,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function reassignBookingAsAdmin(id, workerId, reason) {
  const { data, error } = await supabase.rpc('admin_reassign_booking', {
    p_booking_id: id,
    p_worker_id: workerId,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}
