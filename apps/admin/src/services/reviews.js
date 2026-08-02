import { supabase, status, identity } from './adminShared';

export async function loadReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select(
      'id,stars,body,moderation_status,created_at,user_profiles:user_account_id(display_name),worker_profiles:worker_account_id(display_name),bookings(service_requests(service_categories(name)))',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    customer: identity(row.user_profiles?.display_name, 'Review customer'),
    worker: identity(row.worker_profiles?.display_name, 'Review worker'),
    service: identity(row.bookings?.service_requests?.service_categories?.name, 'Reviewed service'),
    rating: row.stars,
    comment: row.body,
    date: new Date(row.created_at).toLocaleDateString(),
    status: status(row.moderation_status),
    reportCount: null,
  }));
}

export async function moderateReview(id, decision) {
  const { data, error } = await supabase.rpc('moderate_review', { review_id: id, decision });
  if (error) throw error;
  return data;
}
