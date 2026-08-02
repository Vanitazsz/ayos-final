import { supabase, status, identity, accountName } from './adminShared';

export async function loadSafetyCases() {
  const [reportsResult, disputesResult] = await Promise.all([
    supabase
      .from('account_reports')
      .select('id,reporter_id,reported_id,booking_id,reason_code,details,status,created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('booking_disputes')
      .select('id,booking_id,opened_by,reason,status,created_at')
      .order('created_at', { ascending: false }),
  ]);
  if (reportsResult.error) throw reportsResult.error;
  if (disputesResult.error) throw disputesResult.error;
  return [
    ...(reportsResult.data ?? []).map((row) => ({
      id: row.id,
      kind: 'Report',
      bookingId: row.booking_id,
      openedBy: row.reporter_id,
      subjectId: row.reported_id,
      reason: `${status(row.reason_code)} — ${row.details}`,
      status: status(row.status),
      createdAt: row.created_at,
    })),
    ...(disputesResult.data ?? []).map((row) => ({
      id: row.id,
      kind: 'Dispute',
      bookingId: row.booking_id,
      openedBy: row.opened_by,
      subjectId: null,
      reason: row.reason,
      status: status(row.status),
      createdAt: row.created_at,
    })),
  ].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
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
