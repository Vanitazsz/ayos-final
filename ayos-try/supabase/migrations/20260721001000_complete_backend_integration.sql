-- Complete backend integration for the supplied User, Worker, and Admin interfaces.
-- Customer settlement is Cash-only. Historical PayMongo rows remain readable,
-- but all provider mutation entry points are retired.

alter table public.payments
  add constraint payments_new_rows_cash_only check (method = 'CASH') not valid;

drop function if exists public.begin_gcash_payment(uuid, text);
drop function if exists public.apply_paymongo_payment_event(text, text, boolean, text, text, text, bigint, text);
drop function if exists public.apply_paymongo_wallet_topup_event(text, text, boolean, text, text, text, bigint, text);
drop function if exists public.begin_wallet_topup(bigint, text);

-- Consolidate service-request visibility in a security-definer helper. The
-- earlier pair of mutually-referencing request/match policies could recurse
-- when PostgreSQL evaluated a direct request read.
create or replace function public.can_read_service_request(p_request_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(exists (
    select 1 from public.service_requests request
    where request.id = p_request_id and (
      request.user_account_id = auth.uid()
      or request.selected_worker_id = auth.uid()
      or public.is_admin(false)
      or exists (
        select 1 from public.match_candidates candidate
        where candidate.service_request_id = request.id
          and candidate.worker_id = auth.uid()
          and candidate.eligible
      )
    )
  ), false)
$$;
drop policy if exists requests_authorized_read on public.service_requests;
drop policy if exists matching_worker_request_read on public.service_requests;
create policy requests_authorized_read on public.service_requests
for select to authenticated using (public.can_read_service_request(id));
revoke all on function public.can_read_service_request(uuid) from public, anon;
grant execute on function public.can_read_service_request(uuid) to authenticated;

-- Structured, policy-versioned cancellation replaces encoded free-form reasons.
-- The offer/cancellation migration already introduced the structured columns;
-- widen its stage vocabulary to the canonical lifecycle.
alter table public.cancellations drop constraint if exists cancellations_job_stage_check;
alter table public.cancellations
  add constraint cancellations_job_stage_check check (
    job_stage is null or job_stage in (
      'BEFORE_ACCEPTANCE', 'BEFORE_TRAVEL', 'TRAVELLING', 'EN_ROUTE', 'ARRIVED',
      'SERVICE_STARTED', 'IN_PROGRESS'
    )
  ),
  add constraint cancellations_reason_code_format_check check (
    reason_code is null or reason_code ~ '^[A-Z][A-Z0-9_]{2,79}$'
  );

create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_expected_version integer,
  p_stage text,
  p_reason_code text,
  p_details text,
  p_policy_version text
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  current_booking public.bookings;
  result public.bookings;
begin
  select * into current_booking from public.bookings where id = p_booking_id for update;
  if current_booking.id is null or not public.is_booking_party(current_booking.id) then
    raise exception using errcode = '42501', message = 'BOOKING_UNAVAILABLE';
  end if;
  if current_booking.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'BOOKING_VERSION_CONFLICT';
  end if;
  if current_booking.status in ('COMPLETED', 'CANCELLED') then
    raise exception using errcode = '55000', message = 'BOOKING_CANNOT_BE_CANCELLED';
  end if;
  if p_stage not in (
    'BEFORE_ACCEPTANCE', 'BEFORE_TRAVEL', 'EN_ROUTE', 'ARRIVED',
    'SERVICE_STARTED', 'IN_PROGRESS'
  ) or coalesce(p_reason_code, '') !~ '^[A-Z][A-Z0-9_]{2,79}$'
    or length(trim(coalesce(p_details, ''))) not between 3 and 1000
    or length(trim(coalesce(p_policy_version, ''))) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'INVALID_CANCELLATION';
  end if;

  update public.bookings
  set status = 'CANCELLED', cancelled_at = now(), version = version + 1
  where id = current_booking.id
  returning * into result;

  insert into public.cancellations(
    booking_id, cancelled_by, reason, policy_version, job_stage, reason_code, initiator_role
  ) values (
    result.id, auth.uid(), trim(p_details), trim(p_policy_version),
    p_stage, p_reason_code, public.current_role()
  );
  insert into public.booking_status_events(booking_id, from_status, to_status, actor_id, reason)
  values (
    result.id, current_booking.status, 'CANCELLED', auth.uid(),
    p_reason_code || ': ' || trim(p_details)
  );
  update public.service_requests
  set status = 'CANCELLED', updated_at = now()
  where id = result.service_request_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'BOOKING_CANCELLED', 'booking', result.id::text,
    jsonb_build_object(
      'stage', p_stage,
      'reason_code', p_reason_code,
      'policy_version', trim(p_policy_version)
    )
  );
  return result;
end $$;

-- Lifecycle transitions remain worker/admin-controlled; all cancellations must
-- pass through cancel_booking so their stage, code, details, and policy version
-- are always captured atomically.
create or replace function public.transition_booking(
  p_booking_id uuid,
  p_target_status public.booking_status,
  p_expected_version integer,
  p_reason text default null
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare booking public.bookings; allowed boolean := false; result public.bookings;
begin
  if p_target_status = 'CANCELLED' then
    raise exception using errcode = '22023', message = 'USE_CANCEL_BOOKING';
  end if;
  select * into booking from public.bookings b where b.id = p_booking_id for update;
  if booking.id is null or not public.is_booking_party(p_booking_id) then
    raise exception using errcode = '42501', message = 'BOOKING_UNAVAILABLE';
  end if;
  if booking.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'BOOKING_VERSION_CONFLICT';
  end if;
  allowed := case booking.status
    when 'PENDING' then p_target_status = 'ACCEPTED'
    when 'ACCEPTED' then p_target_status = 'WORKER_PREPARING'
    when 'WORKER_PREPARING' then p_target_status = 'WORKER_EN_ROUTE'
    when 'WORKER_EN_ROUTE' then p_target_status = 'WORKER_ARRIVED'
    when 'WORKER_ARRIVED' then p_target_status = 'SERVICE_STARTED'
    when 'SERVICE_STARTED' then p_target_status = 'IN_PROGRESS'
    when 'IN_PROGRESS' then p_target_status = 'COMPLETED'
    else false
  end;
  if not allowed then
    raise exception using errcode = 'P0001', message = 'INVALID_BOOKING_TRANSITION';
  end if;
  if auth.uid() <> booking.worker_account_id and not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'WORKER_OR_ADMIN_REQUIRED';
  end if;
  if p_target_status = 'ACCEPTED' and auth.uid() <> booking.worker_account_id then
    raise exception using errcode = '42501', message = 'ASSIGNED_WORKER_REQUIRED';
  end if;
  update public.bookings
  set status = p_target_status,
      version = version + 1,
      accepted_at = case when p_target_status = 'ACCEPTED' then now() else accepted_at end,
      completed_at = case when p_target_status = 'COMPLETED' then now() else completed_at end
  where id = booking.id returning * into result;
  insert into public.booking_status_events(booking_id, from_status, to_status, actor_id, reason)
  values (booking.id, booking.status, p_target_status, auth.uid(), nullif(trim(p_reason), ''));
  if p_target_status = 'COMPLETED' then
    update public.service_requests set status = 'CLOSED' where id = booking.service_request_id;
  end if;
  return result;
end $$;

-- Manual Worker wallet funding. Approval is the only path that credits funds.
alter table public.wallet_topups drop constraint if exists wallet_topups_provider_check;
alter table public.wallet_topups drop constraint if exists wallet_topups_status_check;
alter table public.wallet_topups alter column provider set default 'MANUAL';
alter table public.wallet_topups
  add column channel text,
  add column reference_number text,
  add column proof_path text,
  add column submitted_at timestamptz,
  add column reviewed_by uuid references public.admin_profiles(account_id) on delete set null,
  add column reviewed_at timestamptz,
  add column review_notes text;

alter table public.wallet_topups
  add constraint wallet_topups_provider_check check (provider in ('MANUAL', 'PAYMONGO')),
  add constraint wallet_topups_status_check check (
    status in (
      'PENDING', 'REQUIRES_ACTION', 'PROCESSING', 'SUCCESSFUL',
      'FAILED', 'EXPIRED', 'CANCELLED'
    )
  ),
  add constraint wallet_topups_channel_check check (channel is null or channel in ('GCASH', 'BANK')),
  add constraint wallet_topups_reference_check check (
    reference_number is null or length(reference_number) between 4 and 120
  ),
  add constraint wallet_topups_proof_path_check check (
    proof_path is null or length(proof_path) between 3 and 1024
  ),
  add constraint wallet_topups_review_notes_check check (
    review_notes is null or length(review_notes) <= 2000
  );

create unique index wallet_topups_manual_reference_unique
  on public.wallet_topups(channel, lower(reference_number))
  where provider = 'MANUAL' and status <> 'FAILED' and reference_number is not null;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'topup-proofs', 'topup-proofs', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict(id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy topup_proofs_owner_upload on storage.objects
for insert to authenticated
with check (
  bucket_id = 'topup-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_role() = 'WORKER'
);
create policy topup_proofs_owner_or_admin_read on storage.objects
for select to authenticated
using (
  bucket_id = 'topup-proofs'
  and (owner_id = auth.uid()::text or public.is_admin(true))
);
create policy topup_proofs_owner_delete_pending on storage.objects
for delete to authenticated
using (
  bucket_id = 'topup-proofs'
  and owner_id = auth.uid()::text
  and not exists (
    select 1 from public.wallet_topups topup
    where topup.proof_path = name and topup.status in ('PROCESSING', 'SUCCESSFUL')
  )
);

create or replace function public.submit_manual_wallet_topup(
  p_amount_centavos bigint,
  p_channel text,
  p_reference_number text,
  p_proof_path text,
  p_idempotency_key text
) returns public.wallet_topups
language plpgsql security definer set search_path = '' as $$
declare
  wallet public.wallet_accounts;
  existing_topup public.wallet_topups;
  result public.wallet_topups;
begin
  if public.current_role() <> 'WORKER'
    or p_amount_centavos not between 10000 and 10000000
    or p_channel not in ('GCASH', 'BANK')
    or length(trim(coalesce(p_reference_number, ''))) not between 4 and 120
    or length(p_idempotency_key) not between 16 and 128
    or not p_proof_path like auth.uid()::text || '/%' then
    raise exception using errcode = '22023', message = 'INVALID_TOPUP_REQUEST';
  end if;
  if not exists (
    select 1 from storage.objects object
    where object.bucket_id = 'topup-proofs'
      and object.name = p_proof_path
      and object.owner_id = auth.uid()::text
  ) then
    raise exception using errcode = '22023', message = 'TOPUP_PROOF_REQUIRED';
  end if;

  select * into existing_topup
  from public.wallet_topups where idempotency_key = p_idempotency_key;
  if existing_topup.id is not null then
    if existing_topup.amount_centavos <> p_amount_centavos
      or existing_topup.reference_number <> trim(p_reference_number) then
      raise exception using errcode = '23505', message = 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return existing_topup;
  end if;

  insert into public.wallet_accounts(account_id) values (auth.uid())
  on conflict(account_id) do update set updated_at = now()
  returning * into wallet;
  if wallet.status <> 'ACTIVE' then
    raise exception using errcode = '42501', message = 'WALLET_UNAVAILABLE';
  end if;

  insert into public.wallet_topups(
    wallet_account_id, status, amount_centavos, provider, idempotency_key,
    channel, reference_number, proof_path, submitted_at
  ) values (
    wallet.id, 'PENDING', p_amount_centavos, 'MANUAL', p_idempotency_key,
    p_channel, trim(p_reference_number), p_proof_path, now()
  ) returning * into result;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'MANUAL_TOPUP_SUBMITTED', 'wallet_topup', result.id::text,
    jsonb_build_object(
      'channel', result.channel,
      'amount_centavos', result.amount_centavos,
      'reference_hash', encode(extensions.digest(result.reference_number, 'sha256'), 'hex')
    )
  );
  return result;
end $$;

create or replace function public.admin_review_wallet_topup(
  p_topup_id uuid,
  p_decision text,
  p_notes text default null
) returns public.wallet_topups
language plpgsql security definer set search_path = '' as $$
declare
  topup public.wallet_topups;
  result public.wallet_topups;
begin
  if not public.is_admin(false)
    or coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2'
    or p_decision not in ('APPROVED', 'REJECTED') then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  if p_decision = 'REJECTED' and length(trim(coalesce(p_notes, ''))) < 3 then
    raise exception using errcode = '22023', message = 'REJECTION_REASON_REQUIRED';
  end if;
  select * into topup from public.wallet_topups where id = p_topup_id for update;
  if topup.id is null or topup.provider <> 'MANUAL' or topup.status <> 'PENDING' then
    raise exception using errcode = '55000', message = 'TOPUP_CANNOT_BE_REVIEWED';
  end if;

  update public.wallet_topups
  set status = case when p_decision = 'APPROVED' then 'SUCCESSFUL' else 'FAILED' end,
      reviewed_by = auth.uid(), reviewed_at = now(), completed_at = now(),
      review_notes = nullif(trim(coalesce(p_notes, '')), ''),
      failure_reason = case when p_decision = 'REJECTED' then trim(p_notes) else null end
  where id = topup.id
  returning * into result;

  if p_decision = 'APPROVED' then
    insert into public.wallet_transactions(
      wallet_account_id, kind, status, amount, source_type, source_id,
      description, available_at
    ) values (
      topup.wallet_account_id, 'TOP_UP', 'AVAILABLE', topup.amount_centavos::numeric / 100,
      'WALLET_TOPUP', topup.id, topup.channel || ' manual wallet top-up', now()
    ) on conflict(wallet_account_id, source_type, source_id, kind) do nothing;
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'MANUAL_TOPUP_' || p_decision, 'wallet_topup', topup.id::text,
    jsonb_build_object('notes', p_notes)
  );
  return result;
end $$;

-- Support attachments use the same private ownership convention as other media.
create table public.support_message_attachments (
  id uuid primary key default gen_random_uuid(),
  support_message_id uuid not null references public.support_ticket_messages(id) on delete cascade,
  storage_path text not null unique,
  content_type text not null check (
    content_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
  ),
  byte_size integer not null check (byte_size between 1 and 15728640),
  created_at timestamptz not null default now()
);
alter table public.support_message_attachments enable row level security;
revoke all on public.support_message_attachments from anon, authenticated;
grant select on public.support_message_attachments to authenticated;
create policy support_attachments_participant_read on public.support_message_attachments
for select to authenticated using (
  exists (
    select 1
    from public.support_ticket_messages message
    join public.support_tickets ticket on ticket.id = message.ticket_id
    where message.id = support_message_id
      and (ticket.owner_id = auth.uid() or public.is_admin(false))
  )
);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-attachments', 'support-attachments', false, 15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict(id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
create policy support_attachments_owner_upload on storage.objects
for insert to authenticated with check (
  bucket_id = 'support-attachments' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy support_attachments_authorized_read on storage.objects
for select to authenticated using (
  bucket_id = 'support-attachments' and (
    owner_id = auth.uid()::text or public.is_admin(false) or exists (
      select 1
      from public.support_message_attachments attachment
      join public.support_ticket_messages message on message.id = attachment.support_message_id
      join public.support_tickets ticket on ticket.id = message.ticket_id
      where attachment.storage_path = name and ticket.owner_id = auth.uid()
    )
  )
);

create or replace function public.attach_support_message_media(
  p_support_message_id uuid,
  p_storage_path text,
  p_content_type text,
  p_byte_size integer
) returns public.support_message_attachments
language plpgsql security definer set search_path = '' as $$
declare
  result public.support_message_attachments;
begin
  if not exists (
    select 1
    from public.support_ticket_messages message
    join public.support_tickets ticket on ticket.id = message.ticket_id
    where message.id = p_support_message_id
      and (ticket.owner_id = auth.uid() or public.is_admin(true))
  ) or not p_storage_path like auth.uid()::text || '/%'
    or p_content_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
    or p_byte_size not between 1 and 15728640
    or not exists (
      select 1 from storage.objects object
      where object.bucket_id = 'support-attachments'
        and object.name = p_storage_path
        and object.owner_id = auth.uid()::text
    ) then
    raise exception using errcode = '42501', message = 'SUPPORT_ATTACHMENT_UNAVAILABLE';
  end if;
  insert into public.support_message_attachments(
    support_message_id, storage_path, content_type, byte_size
  ) values (
    p_support_message_id, p_storage_path, p_content_type, p_byte_size
  ) returning * into result;
  return result;
end $$;

-- Expo push subscriptions and audited delivery attempts.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  expo_push_token text not null unique check (length(expo_push_token) between 20 and 255),
  platform text not null check (platform in ('IOS', 'ANDROID')),
  device_key text not null check (length(device_key) between 16 and 128),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  invalidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, device_key)
);
create table public.push_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null check (status in ('PENDING', 'SENT', 'FAILED', 'INVALID_TOKEN')),
  provider_reference text,
  failure_reason text,
  attempted_at timestamptz not null default now(),
  unique(notification_id, subscription_id)
);
alter table public.push_subscriptions enable row level security;
alter table public.push_delivery_attempts enable row level security;
revoke all on public.push_subscriptions, public.push_delivery_attempts from anon, authenticated;
grant select on public.push_subscriptions, public.push_delivery_attempts to authenticated;
create policy push_subscriptions_owner_read on public.push_subscriptions
for select to authenticated using (account_id = auth.uid() or public.is_admin(true));
create policy push_attempts_owner_or_admin_read on public.push_delivery_attempts
for select to authenticated using (
  public.is_admin(true) or exists (
    select 1 from public.push_subscriptions subscription
    where subscription.id = subscription_id and subscription.account_id = auth.uid()
  )
);
create trigger set_push_subscriptions_updated_at before update on public.push_subscriptions
for each row execute function public.set_updated_at();

create or replace function public.register_push_subscription(
  p_expo_push_token text,
  p_platform text,
  p_device_key text
) returns public.push_subscriptions
language plpgsql security definer set search_path = '' as $$
declare result public.push_subscriptions;
begin
  if auth.uid() is null
    or p_expo_push_token !~ '^ExponentPushToken\[[A-Za-z0-9_-]+\]$|^ExpoPushToken\[[A-Za-z0-9_-]+\]$'
    or p_platform not in ('IOS', 'ANDROID')
    or length(p_device_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'INVALID_PUSH_SUBSCRIPTION';
  end if;
  insert into public.push_subscriptions(
    account_id, expo_push_token, platform, device_key, enabled, last_seen_at, invalidated_at
  ) values (
    auth.uid(), p_expo_push_token, p_platform, p_device_key, true, now(), null
  )
  on conflict(account_id, device_key) do update
  set expo_push_token = excluded.expo_push_token,
      platform = excluded.platform,
      enabled = true,
      last_seen_at = now(),
      invalidated_at = null
  returning * into result;
  return result;
end $$;

create or replace function public.remove_push_subscription(p_device_key text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  update public.push_subscriptions
  set enabled = false, invalidated_at = now(), updated_at = now()
  where account_id = auth.uid() and device_key = p_device_key and enabled;
  get diagnostics changed = row_count;
  return changed = 1;
end $$;

select pgmq.create('push_notifications');
create or replace function public.enqueue_push_delivery()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.push_subscriptions subscription
    where subscription.account_id = new.recipient_id and subscription.enabled
  ) then
    perform pgmq.send(
      'push_notifications',
      jsonb_build_object(
        'notification_id', new.notification_id,
        'recipient_id', new.recipient_id
      )
    );
  end if;
  return new;
end $$;
create trigger enqueue_push_delivery
after insert on public.notification_deliveries
for each row execute function public.enqueue_push_delivery();

-- Admin notification commands used by the supplied action menus.
create or replace function public.admin_duplicate_notification(p_notification_id uuid)
returns public.notifications language plpgsql security definer set search_path = '' as $$
declare source public.notifications; result public.notifications;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  select * into source from public.notifications where id = p_notification_id;
  if source.id is null then raise exception using errcode = 'P0002', message = 'NOTIFICATION_NOT_FOUND'; end if;
  insert into public.notifications(recipient_id, audience, title, body, category, status)
  values (
    source.recipient_id, source.audience, source.title || ' (Copy)',
    source.body, source.category, 'DRAFT'
  )
  returning * into result;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'NOTIFICATION_DUPLICATED', 'notification', result.id::text,
    jsonb_build_object('source_id', source.id));
  return result;
end $$;

create or replace function public.admin_send_notification_now(p_notification_id uuid)
returns public.notifications language plpgsql security definer set search_path = '' as $$
declare result public.notifications;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  update public.notifications
  set status = 'SENT', sent_at = now(), scheduled_at = null, updated_at = now()
  where id = p_notification_id and status in ('DRAFT', 'SCHEDULED', 'FAILED')
  returning * into result;
  if result.id is null then raise exception using errcode = '55000', message = 'NOTIFICATION_CANNOT_BE_SENT'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'NOTIFICATION_SENT', 'notification', result.id::text);
  return result;
end $$;

create or replace function public.admin_archive_notification(p_notification_id uuid)
returns public.trash_entries language plpgsql security definer set search_path = '' as $$
declare source public.notifications; result public.trash_entries;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  select * into source from public.notifications where id = p_notification_id for update;
  if source.id is null then raise exception using errcode = 'P0002', message = 'NOTIFICATION_NOT_FOUND'; end if;
  if source.status = 'SCHEDULED' then
    update public.notifications set status = 'FAILED', updated_at = now() where id = source.id;
  end if;
  insert into public.trash_entries(entity_type, entity_id, snapshot, deleted_by)
  values ('notification', source.id::text, to_jsonb(source), auth.uid())
  returning * into result;
  delete from public.notifications where id = source.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'NOTIFICATION_ARCHIVED', 'notification', source.id::text);
  return result;
end $$;

-- Report formats and one authorized aggregate contract for Admin dashboard cards/charts.
alter table public.report_exports
  add column format text not null default 'CSV',
  add column filters jsonb not null default '{}';
alter table public.report_exports
  add constraint report_exports_format_check check (format in ('CSV', 'XLSX', 'PDF'));

create or replace function public.get_admin_dashboard_metrics(
  p_from timestamptz default null,
  p_to timestamptz default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare start_at timestamptz := coalesce(p_from, now() - interval '30 days');
declare end_at timestamptz := coalesce(p_to, now());
declare result jsonb;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  if start_at >= end_at or end_at - start_at > interval '366 days' then
    raise exception using errcode = '22023', message = 'INVALID_ANALYTICS_RANGE';
  end if;
  select jsonb_build_object(
    'users', (select count(*) from public.accounts where role = 'USER' and deleted_at is null),
    'workers', (select count(*) from public.worker_profiles where approval_status = 'APPROVED'),
    'pendingWorkers', (select count(*) from public.worker_profiles where approval_status in ('PENDING', 'NEEDS_DOCUMENTS')),
    'activeBookings', (select count(*) from public.bookings where status not in ('COMPLETED', 'CANCELLED')),
    'completedBookings', (select count(*) from public.bookings where status = 'COMPLETED' and completed_at between start_at and end_at),
    'successfulCashVolume', (select coalesce(sum(service_amount), 0) from public.payments where method = 'CASH' and status = 'SUCCESSFUL' and successful_at between start_at and end_at),
    'pendingRefunds', (select count(*) from public.refunds where status = 'PENDING'),
    'openSupportTickets', (select count(*) from public.support_tickets where status in ('OPEN', 'ESCALATED')),
    'series', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', bucket::date,
        'bookings', booking_count,
        'revenue', revenue
      ) order by bucket)
      from (
        select day.bucket,
          count(distinct booking.id) as booking_count,
          coalesce(sum(payment.service_amount) filter (where payment.status = 'SUCCESSFUL'), 0) as revenue
        from generate_series(date_trunc('day', start_at), date_trunc('day', end_at), interval '1 day') day(bucket)
        left join public.bookings booking on date_trunc('day', booking.created_at) = day.bucket
        left join public.payments payment on payment.booking_id = booking.id
        group by day.bucket
      ) daily
    ), '[]'::jsonb)
  ) into result;
  return result;
end $$;

-- Worker onboarding identity is accepted only as the structured contract used
-- by the supplied registration flow. Direct client writes are retired.
create or replace function public.submit_worker_onboarding_identity(
  p_identity_data jsonb,
  p_document_paths text[]
) returns public.worker_verifications
language plpgsql security definer set search_path = '' as $$
declare result public.worker_verifications;
begin
  if public.current_role() <> 'WORKER'
    or jsonb_typeof(p_identity_data) <> 'object'
    or coalesce(p_identity_data->>'birthday', '') !~ '^\d{4}-\d{2}-\d{2}$'
    or p_identity_data->>'employmentType' not in ('EMPLOYED', 'FREELANCE')
    or length(trim(coalesce(p_identity_data->>'address', ''))) not between 5 and 500
    or length(trim(coalesce(p_identity_data->>'industry', ''))) not between 2 and 120
    or jsonb_typeof(p_identity_data->'emergencyContact') <> 'object'
    or length(trim(coalesce(p_identity_data#>>'{emergencyContact,name}', ''))) not between 2 and 120
    or length(trim(coalesce(p_identity_data#>>'{emergencyContact,mobile}', ''))) not between 8 and 20
    or jsonb_typeof(p_identity_data->'skills') <> 'array'
    or jsonb_array_length(p_identity_data->'skills') = 0
    or jsonb_typeof(p_identity_data->'governmentId') <> 'object'
    or length(trim(coalesce(p_identity_data#>>'{governmentId,type}', ''))) not between 2 and 80
    or length(trim(coalesce(p_identity_data#>>'{governmentId,number}', ''))) not between 2 and 120
    or jsonb_typeof(p_identity_data->'consents') <> 'object'
    or length(trim(coalesce(p_identity_data#>>'{consents,termsVersion}', ''))) not between 1 and 80
    or length(trim(coalesce(p_identity_data#>>'{consents,privacyVersion}', ''))) not between 1 and 80
    or coalesce(p_identity_data#>>'{consents,acceptedAt}', '') !~ '^\d{4}-\d{2}-\d{2}T'
    or cardinality(p_document_paths) = 0 then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_ONBOARDING';
  end if;
  if exists (
    select 1 from unnest(p_document_paths) path
    where path not like auth.uid()::text || '/%'
      or not exists (
        select 1 from storage.objects object
        where object.bucket_id = 'verification-documents'
          and object.name = path
          and object.owner_id = auth.uid()::text
      )
  ) then
    raise exception using errcode = '22023', message = 'INVALID_VERIFICATION_DOCUMENT';
  end if;
  insert into public.worker_verifications(worker_id, status, identity_data, document_paths)
  values (auth.uid(), 'PENDING', p_identity_data, p_document_paths)
  on conflict(worker_id) do update
  set status = 'PENDING',
      identity_data = excluded.identity_data,
      document_paths = excluded.document_paths,
      requested_notes = null,
      reviewed_by = null,
      reviewed_at = null,
      updated_at = now()
  where public.worker_verifications.status in ('PENDING', 'NEEDS_DOCUMENTS', 'REJECTED')
  returning * into result;
  if result.id is null then
    raise exception using errcode = '55000', message = 'VERIFICATION_CANNOT_BE_RESUBMITTED';
  end if;
  return result;
end $$;

revoke insert on public.worker_verifications from authenticated;
revoke update(identity_data, document_paths) on public.worker_verifications from authenticated;

revoke all on function public.cancel_booking(uuid, integer, text, text, text, text) from public, anon;
revoke all on function public.submit_manual_wallet_topup(bigint, text, text, text, text) from public, anon;
revoke all on function public.admin_review_wallet_topup(uuid, text, text) from public, anon;
revoke all on function public.attach_support_message_media(uuid, text, text, integer) from public, anon;
revoke all on function public.register_push_subscription(text, text, text) from public, anon;
revoke all on function public.remove_push_subscription(text) from public, anon;
revoke all on function public.admin_duplicate_notification(uuid) from public, anon;
revoke all on function public.admin_send_notification_now(uuid) from public, anon;
revoke all on function public.admin_archive_notification(uuid) from public, anon;
revoke all on function public.get_admin_dashboard_metrics(timestamptz, timestamptz) from public, anon;
revoke all on function public.submit_worker_onboarding_identity(jsonb, text[]) from public, anon;

grant execute on function public.cancel_booking(uuid, integer, text, text, text, text) to authenticated;
grant execute on function public.submit_manual_wallet_topup(bigint, text, text, text, text) to authenticated;
grant execute on function public.admin_review_wallet_topup(uuid, text, text) to authenticated;
grant execute on function public.attach_support_message_media(uuid, text, text, integer) to authenticated;
grant execute on function public.register_push_subscription(text, text, text) to authenticated;
grant execute on function public.remove_push_subscription(text) to authenticated;
grant execute on function public.admin_duplicate_notification(uuid) to authenticated;
grant execute on function public.admin_send_notification_now(uuid) to authenticated;
grant execute on function public.admin_archive_notification(uuid) to authenticated;
grant execute on function public.get_admin_dashboard_metrics(timestamptz, timestamptz) to authenticated;
grant execute on function public.submit_worker_onboarding_identity(jsonb, text[]) to authenticated;
