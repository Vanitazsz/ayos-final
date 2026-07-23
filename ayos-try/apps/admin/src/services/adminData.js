import { supabase } from '../lib/supabase';
const money = (value) =>
  `₱${Number(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const status = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const identity = (value, context) => {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${context} profile is incomplete`);
  return value.trim();
};
const accountName = (account) =>
  account?.user_profiles?.display_name ??
  account?.worker_profiles?.display_name ??
  account?.admin_profiles?.display_name ??
  null;
export const subscribe = (table, refresh) => {
  const channel = supabase
    .channel(`admin:${table}:${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, refresh)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
};
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
    supabase.from('bookings').select('user_account_id,status,service_requests(budget)'),
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
export async function setAccountStatus(id, nextStatus) {
  const { data, error } = await supabase.rpc('set_account_status', {
    account_id: id,
    next_status: nextStatus,
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
export async function softDeleteAccount(id) {
  const { data, error } = await supabase.rpc('admin_soft_delete_account', {
    p_account_id: id,
  });
  if (error) throw error;
  return data;
}
export async function loadWorkers() {
  const { data, error } = await supabase
    .from('worker_profiles')
    .select(
      'account_id,display_name,bio,experience,service_area,service_origin,service_radius_meters,approval_status,is_available,created_at,accounts!worker_profiles_account_id_fkey!inner(email,mobile,status,role,deleted_at),worker_skills!worker_skills_worker_id_fkey(years,service_categories!worker_skills_category_id_fkey(name)),worker_availability!worker_availability_worker_id_fkey(count),worker_verifications!worker_verifications_worker_id_fkey(id,status),bookings!bookings_worker_account_id_fkey(count),reviews!reviews_worker_account_id_fkey(stars)',
    )
    .eq('accounts.role', 'WORKER')
    .is('accounts.deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const workerIds = rows.map((row) => row.account_id);
  const { data: wallets, error: walletError } = workerIds.length
    ? await supabase
        .from('wallet_accounts')
        .select('account_id,wallet_transactions(amount,status)')
        .in('account_id', workerIds)
    : { data: [], error: null };
  if (walletError) throw walletError;
  const walletByWorker = new Map((wallets ?? []).map((wallet) => [wallet.account_id, wallet]));

  return rows.map((row) => {
    const verification = Array.isArray(row.worker_verifications)
      ? row.worker_verifications[0]
      : row.worker_verifications;
    const skillsReady = (row.worker_skills?.length ?? 0) > 0;
    const serviceAreaReady = Boolean(
      row.service_origin && row.service_radius_meters,
    );
    const scheduleReady =
      Number(row.worker_availability?.[0]?.count ?? 0) > 0;
    const matchingReady = Boolean(
      row.approval_status === 'APPROVED' &&
        skillsReady &&
        serviceAreaReady &&
        scheduleReady &&
        row.is_available,
    );
    const matchingMissing = [
      row.approval_status !== 'APPROVED' ? 'approval' : null,
      !skillsReady ? 'skills' : null,
      !serviceAreaReady ? 'service area' : null,
      !scheduleReady ? 'schedule' : null,
      !row.is_available ? 'online status' : null,
    ].filter(Boolean);
    return {
      id: row.account_id,
      name: identity(row.display_name, 'Worker'),
      email: row.accounts?.email ?? '',
      phone: row.accounts?.mobile ?? '',
      category: row.worker_skills?.[0]?.service_categories?.name ?? '',
      rating: row.reviews?.length
        ? (row.reviews.reduce((sum, item) => sum + item.stars, 0) / row.reviews.length).toFixed(1)
        : '0.0',
      jobsCompleted: row.bookings?.[0]?.count ?? 0,
      experience: Math.max(...(row.worker_skills ?? []).map((item) => item.years), 0),
      status: status(row.accounts?.status),
      verified: row.approval_status === 'APPROVED',
      location: row.service_area ?? '',
      registeredDate: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
      earnings: (
        walletByWorker
          .get(row.account_id)
          ?.wallet_transactions?.filter((transaction) =>
            ['AVAILABLE', 'COMPLETED'].includes(transaction.status),
          )
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0) ??
        0
      ),
      availability: row.is_available ? 'Online' : 'Offline',
      verificationStatus: verification?.status ?? row.approval_status,
      verificationId: verification?.id ?? null,
      matchingReady,
      matchingMissing,
    };
  });
}
export async function reviewWorker(verificationId, decision, notes) {
  const { data, error } = await supabase.rpc('review_worker_verification', {
    verification_id: verificationId,
    decision,
    notes,
  });
  if (error) throw error;
  return data;
}
export async function deleteAccount(id, email) {
  const { data: storageObjects, error: storageListError } = await supabase.rpc(
    'admin_list_account_storage_objects',
    { p_account_id: id },
  );
  if (storageListError) throw storageListError;

  const filesByBucket = new Map();
  for (const object of storageObjects ?? []) {
    if (!filesByBucket.has(object.bucket_id)) filesByBucket.set(object.bucket_id, new Set());
    filesByBucket.get(object.bucket_id).add(object.name);
  }
  for (const [bucket, paths] of filesByBucket) {
    const filePaths = [...paths];
    for (let index = 0; index < filePaths.length; index += 100) {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(filePaths.slice(index, index + 100));
      if (error) throw error;
    }
  }

  const { error } = await supabase.rpc('admin_delete_account', {
    p_account_id: id,
    p_confirmation_email: email,
  });
  if (error) throw error;
}
export async function loadBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id,service_request_id,status,version,created_at,user_profiles:user_account_id(display_name),worker_profiles:worker_account_id(display_name),service_requests(description,scheduled_at,budget,addresses(line1,barangay,city),service_categories(name),match_candidates(worker_id,score,eligible,worker_profiles:worker_id(display_name))),payments(method,status,service_amount,homeowner_platform_charge,refunds(status,reason)),cancellations(reason,fee_amount,refund_amount,resolution_status),booking_status_events(from_status,to_status,reason,created_at)',
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
    price: Number(row.service_requests?.budget ?? 0),
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
export async function loadSupport() {
  const { data, error } = await supabase
    .from('support_tickets')
    .select(
      'id,subject,description,status,category,priority,created_at,owner:accounts!support_tickets_owner_id_fkey(user_profiles(display_name),worker_profiles(display_name),admin_profiles(display_name)),assignee:admin_profiles!support_tickets_assigned_admin_id_fkey(display_name),support_ticket_messages(id,body,created_at,sender_id,sender:accounts!support_ticket_messages_sender_id_fkey(user_profiles(display_name),worker_profiles(display_name),admin_profiles(display_name)))',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    customer: identity(accountName(row.owner), 'Support requester'),
    subject: row.subject,
    category: row.category ? status(row.category) : '',
    priority: row.priority ? status(row.priority) : '',
    status: status(row.status),
    date: new Date(row.created_at).toLocaleDateString(),
    assignedTo: row.assignee?.display_name ?? '',
    messageCount: row.support_ticket_messages?.length ?? 0,
    description: row.description,
    messages: (row.support_ticket_messages ?? [])
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((message) => ({
        id: message.id,
        body: message.body,
        createdAt: message.created_at,
        senderId: message.sender_id,
        sender: identity(accountName(message.sender), 'Support participant'),
      })),
  }));
}
export async function sendSupportReply(ticketId, body) {
  const { error } = await supabase.rpc('send_support_message', {
    p_ticket_id: ticketId,
    p_body: body,
    p_internal: false,
  });
  if (error) throw error;
}
export async function updateSupport(ticketId, nextStatus, resolution = null) {
  const { data, error } = await supabase.rpc('update_support_ticket', {
    p_ticket_id: ticketId,
    p_next_status: nextStatus,
    p_resolution: resolution,
  });
  if (error) throw error;
  return data;
}
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
export async function loadTrash() {
  const { data, error } = await supabase
    .from('trash_entries')
    .select('*')
    .is('restored_at', null)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  const groups = { Users: [], Workers: [], Bookings: [], Services: [], Reviews: [] };
  for (const row of data ?? []) {
    const type = status(row.entity_type);
    const key = type.endsWith('s') ? type : `${type}s`;
    const target = groups[key] ?? groups.Services;
    target.push({
      id: row.id,
      item: row.entity_id,
      type,
      deletedBy: row.deleted_by,
      deletedDate: new Date(row.deleted_at).toLocaleDateString(),
      restoreDeadline: 'Retention policy',
      snapshot: row.snapshot,
    });
  }
  return groups;
}
export async function restoreTrash(id) {
  const { data, error } = await supabase.rpc('restore_from_trash', { trash_id: id });
  if (error) throw error;
  return data;
}
export async function permanentlyDeleteTrash(id) {
  const { error } = await supabase.rpc('permanently_delete', { trash_id: id });
  if (error) throw error;
}
export async function loadCatalog() {
  const [{ data: services, error: serviceError }, { data: categories, error: categoryError }] =
    await Promise.all([
      supabase
        .from('service_templates')
        .select(
          'id,name,base_price,estimated_duration_minutes,is_active,service_categories(name,worker_skills(count))',
        )
        .is('archived_at', null)
        .order('name'),
      supabase
        .from('service_categories')
        .select('id,name,is_active,service_templates(count)')
        .order('name'),
    ]);
  if (serviceError) throw serviceError;
  if (categoryError) throw categoryError;
  return {
    services: (services ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      category: row.service_categories?.name ?? '',
      price: Number(row.base_price ?? 0),
      duration: row.estimated_duration_minutes ? `${row.estimated_duration_minutes} min` : '',
      workers: row.service_categories?.worker_skills?.[0]?.count ?? 0,
      bookings: null,
      status: row.is_active ? 'Active' : 'Inactive',
    })),
    categories: (categories ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      status: row.is_active ? 'Enabled' : 'Disabled',
      servicesCount: row.service_templates?.[0]?.count ?? 0,
    })),
  };
}
export async function saveService(value, categories) {
  const category = categories.find((item) => item.name === value.category);
  const duration = Number.parseInt(value.duration, 10) || 60;
  const { data, error } = await supabase.rpc('admin_upsert_service', {
    p_id: value.id || null,
    p_name: value.name,
    p_category_id: category?.id,
    p_minimum_price_minor: Math.round(Number(value.price) * 100),
    p_maximum_price_minor: Math.round(Number(value.price) * 100),
    p_duration_minutes: duration,
    p_is_active: value.status === 'Active',
  });
  if (error) throw error;
  return data;
}
export async function saveCategory(value) {
  const { data, error } = await supabase.rpc('admin_upsert_category', {
    p_id: value.id || null,
    p_name: value.name,
    p_is_active: value.status === 'Enabled',
  });
  if (error) throw error;
  return data;
}
export async function setWorkerAvailability(id, available) {
  const { data, error } = await supabase.rpc('admin_set_worker_availability', {
    p_worker_id: id,
    p_available: available,
  });
  if (error) {
    if (error.message === 'WORKER_NOT_READY') {
      throw new Error(
        'This worker needs approval, skills, a service area, and a schedule before going online.',
      );
    }
    throw error;
  }
  return data;
}
export async function publishCampaign(id) {
  const { data, error } = await supabase.rpc('admin_publish_campaign', { p_campaign_id: id });
  if (error) throw error;
  return data;
}
export async function loadSettings() {
  const { data, error } = await supabase.from('system_settings').select('key,value');
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
}
export async function saveSetting(key, value) {
  const { data, error } = await supabase.rpc('admin_set_setting', {
    setting_key: key,
    setting_value: value,
  });
  if (error) throw error;
  return data;
}
export async function loadSubdivisions() {
  const { data, error } = await supabase.rpc('admin_list_subdivisions');
  if (error) throw error;
  return data ?? [];
}
export async function saveSubdivision(input) {
  const params = {
    p_name: input.name,
    p_lat: Number(input.center_lat),
    p_lng: Number(input.center_lng),
    p_radius_meters: Number(input.radius_meters),
    p_boundary: input.boundary ?? null,
  };
  const { data, error } = input.id
    ? await supabase.rpc('admin_update_subdivision', {
        p_id: input.id,
        ...params,
        p_is_active: Boolean(input.is_active),
      })
    : await supabase.rpc('admin_create_subdivision', params);
  if (error) throw error;
  return data;
}
export async function loadSubscriptions() {
  const [
    { data: plans, error: planError },
    { data: subscriptions, error: subscriptionError },
    { data: workers, error: workerError },
  ] = await Promise.all([
    supabase.from('worker_recommendation_plans').select('*').order('created_at'),
    supabase
      .from('worker_recommendation_subscriptions')
      .select('*,worker_profiles:worker_id(display_name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('worker_profiles')
      .select('account_id,display_name')
      .eq('approval_status', 'APPROVED')
      .order('display_name'),
  ]);
  if (planError) throw planError;
  if (subscriptionError) throw subscriptionError;
  if (workerError) throw workerError;
  return { plans: plans ?? [], subscriptions: subscriptions ?? [], workers: workers ?? [] };
}
export async function saveSubscriptionPlan(input) {
  const { data, error } = await supabase.rpc('admin_upsert_subscription_plan', {
    p_id: input.id || null,
    p_name: input.name,
    p_amount: Math.round(Number(input.price) * 100),
    p_duration_days: Number(input.duration_days),
    p_is_active: Boolean(input.is_active),
  });
  if (error) throw error;
  return data;
}
export async function activateSubscription(workerId, planId) {
  const { data, error } = await supabase.rpc('admin_activate_subscription', {
    p_worker_id: workerId,
    p_plan_id: planId,
  });
  if (error) throw error;
  return data;
}
export async function extendSubscription(id, days) {
  const { data, error } = await supabase.rpc('admin_extend_subscription', {
    p_subscription_id: id,
    p_days: Number(days),
  });
  if (error) throw error;
  return data;
}
export async function cancelSubscription(id) {
  const { data, error } = await supabase.rpc('admin_cancel_subscription', {
    p_subscription_id: id,
  });
  if (error) throw error;
  return data;
}
export { money, status };
