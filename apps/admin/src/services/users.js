import { supabase, status, identity } from './adminShared';

export async function loadUsers() {
  const { data, error } = await supabase
    .from('accounts')
    .select(
      'id,email,mobile,status,created_at,user_profiles(display_name,verification_status,bookings!bookings_user_account_id_fkey(count)),addresses(line1,barangay,city)',
    )
    .eq('role', 'USER')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.user_profiles?.display_name?.trim() || row.email?.split('@')[0] || 'Customer',
    email: row.email,
    phone: row.mobile ?? '',
    address: [row.addresses?.[0]?.line1, row.addresses?.[0]?.barangay, row.addresses?.[0]?.city]
      .filter(Boolean)
      .join(', '),
    registeredAt: new Date(row.created_at).toLocaleDateString(),
    status: status(row.status),
    bookings: row.user_profiles?.bookings?.[0]?.count ?? 0,
    verified: row.user_profiles?.verification_status === 'verified',
    verificationStatus: row.user_profiles?.verification_status ?? 'unverified',
  }));
}

export async function loadCustomerVerifications() {
  const { data: rows, error } = await supabase
    .from('customer_verifications')
    .select('*')
    .eq('status', 'pending')
    .order('created_at');
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return [];
    throw error;
  }
  const ids = [...new Set((rows ?? []).map((row) => row.customer_id))];
  const { data: accounts, error: accountError } = ids.length
    ? await supabase.from('accounts').select('id,email,user_profiles(display_name)').in('id', ids)
    : { data: [], error: null };
  if (accountError) throw accountError;
  const byId = new Map((accounts ?? []).map((account) => [account.id, account]));
  return Promise.all(
    (rows ?? []).map(async (row) => {
      const account = byId.get(row.customer_id);
      const [front, back] = await Promise.all([
        supabase.storage.from('verification-documents').createSignedUrl(row.id_front_url, 900),
        row.id_back_url
          ? supabase.storage.from('verification-documents').createSignedUrl(row.id_back_url, 900)
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (front.error) throw front.error;
      if (back.error) throw back.error;
      return {
        ...row,
        customerName: identity(account?.user_profiles?.display_name, 'Verification customer'),
        email: account?.email ?? '',
        frontUrl: front.data?.signedUrl ?? '',
        backUrl: back.data?.signedUrl ?? '',
      };
    }),
  );
}

export async function reviewCustomerVerification(id, decision, notes) {
  const { data, error } = await supabase.rpc('admin_review_customer_verification', {
    p_verification_id: id,
    p_decision: decision,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function updateUser(id, displayName, mobile) {
  const { data, error } = await supabase.rpc('admin_update_user', {
    p_account_id: id,
    p_display_name: displayName,
    p_mobile: mobile || null,
  });
  if (error) throw error;
  return data;
}
