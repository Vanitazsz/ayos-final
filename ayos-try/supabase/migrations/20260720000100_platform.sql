-- A-YOS Supabase platform schema. FR-01–FR-104, NFR-01–NFR-18.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pgmq;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.account_role as enum ('USER', 'WORKER', 'ADMIN');
create type public.account_status as enum ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');
create type public.worker_approval_status as enum ('PENDING', 'NEEDS_DOCUMENTS', 'APPROVED', 'REJECTED');
create type public.request_status as enum ('DRAFT', 'OPEN', 'MATCHED', 'BOOKED', 'CLOSED', 'CANCELLED');
create type public.booking_status as enum ('PENDING', 'ACCEPTED', 'WORKER_PREPARING', 'WORKER_EN_ROUTE', 'WORKER_ARRIVED', 'SERVICE_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
create type public.payment_method as enum ('CASH', 'GCASH', 'MAYA', 'CREDIT_DEBIT_CARD', 'WALLET');
create type public.payment_status as enum ('PENDING', 'AWAITING_CONFIRMATIONS', 'SUCCESSFUL', 'FAILED');
create type public.cash_confirmation_party as enum ('USER', 'WORKER');
create type public.refund_status as enum ('PENDING', 'PROCESSED', 'REJECTED');
create type public.review_moderation_status as enum ('PENDING', 'PUBLISHED', 'REJECTED');
create type public.ticket_status as enum ('OPEN', 'ESCALATED', 'RESOLVED', 'CLOSED');
create type public.notification_audience as enum ('USERS', 'WORKERS', 'EVERYONE');
create type public.notification_status as enum ('DRAFT', 'SCHEDULED', 'SENT', 'FAILED');
create type public.content_key as enum ('TERMS', 'PRIVACY', 'REFUND_POLICY', 'HELP_CENTER');

create table public.accounts (
  id uuid primary key references auth.users(id) on delete restrict,
  role public.account_role not null,
  status public.account_status not null default 'ACTIVE',
  email text not null unique check (length(email) <= 254),
  mobile text unique check (mobile is null or mobile ~ '^\+[1-9][0-9]{7,14}$'),
  is_protected boolean not null default false,
  mfa_enabled boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index accounts_role_status_idx on public.accounts(role, status) where deleted_at is null;

create table public.user_profiles (
  account_id uuid primary key references public.accounts(id) on delete restrict,
  display_name text not null check (length(display_name) between 2 and 120),
  avatar_path text,
  notification_preferences jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.worker_profiles (
  account_id uuid primary key references public.accounts(id) on delete restrict,
  display_name text not null check (length(display_name) between 2 and 120),
  avatar_path text, bio text check (length(bio) <= 2000), experience text check (length(experience) <= 4000),
  service_area text check (length(service_area) <= 255), latitude numeric(9,6), longitude numeric(9,6),
  approval_status public.worker_approval_status not null default 'PENDING',
  recommendation_priority boolean not null default false, is_available boolean not null default false,
  approved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (latitude is null or latitude between -90 and 90), check (longitude is null or longitude between -180 and 180)
);
create index worker_discovery_idx on public.worker_profiles(approval_status, is_available, recommendation_priority);
create table public.admin_profiles (
  account_id uuid primary key references public.accounts(id) on delete restrict,
  display_name text not null check (length(display_name) between 2 and 120),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.worker_verifications (
  id uuid primary key default gen_random_uuid(), worker_id uuid not null unique references public.worker_profiles(account_id) on delete cascade,
  status public.worker_approval_status not null default 'PENDING', identity_data jsonb not null default '{}',
  document_paths text[] not null default '{}', requested_notes text check (length(requested_notes) <= 2000),
  reviewed_by uuid references public.accounts(id) on delete set null, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.worker_availability (
  id uuid primary key default gen_random_uuid(), worker_id uuid not null references public.worker_profiles(account_id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), start_time time not null, end_time time not null,
  timezone text not null default 'Asia/Manila', unique(worker_id, day_of_week, start_time, end_time), check (start_time < end_time)
);
create table public.service_categories (
  id uuid primary key default gen_random_uuid(), name text not null unique check (length(name) between 2 and 120),
  description text check (length(description) <= 1000), is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.worker_skills (
  worker_id uuid not null references public.worker_profiles(account_id) on delete cascade,
  category_id uuid not null references public.service_categories(id) on delete restrict,
  years integer not null default 0 check (years between 0 and 80), primary key(worker_id, category_id)
);
create table public.addresses (
  id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts(id) on delete cascade,
  label text not null check (length(label) between 1 and 80), line1 text not null check (length(line1) <= 255),
  line2 text check (length(line2) <= 255), barangay text not null check (length(barangay) <= 120),
  city text not null check (length(city) <= 120), province text not null check (length(province) <= 120), postal_code text,
  latitude numeric(9,6), longitude numeric(9,6), is_default boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_default_address_per_account on public.addresses(account_id) where is_default;

create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts(id) on delete restrict,
  input_type text not null check (input_type in ('IMAGE','VOICE','TEXT')), input_storage_path text, transcript text,
  detected_issue text, severity text, possible_cause text, suggested_category_name text,
  estimated_cost_minimum numeric(12,2), estimated_cost_maximum numeric(12,2), safety_advice text,
  provider text not null, provider_reference text, saved boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.service_requests (
  id uuid primary key default gen_random_uuid(), user_account_id uuid not null references public.user_profiles(account_id) on delete restrict,
  category_id uuid not null references public.service_categories(id) on delete restrict,
  address_id uuid not null references public.addresses(id) on delete restrict, ai_analysis_id uuid unique references public.ai_analyses(id) on delete set null,
  status public.request_status not null default 'DRAFT', description text not null check (length(description) between 10 and 4000),
  scheduled_at timestamptz not null, budget numeric(12,2) not null check (budget > 0), notes text check (length(notes) <= 2000),
  notify_on_match boolean not null default false, selected_worker_id uuid references public.worker_profiles(account_id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index service_requests_user_status_idx on public.service_requests(user_account_id, status);
create index service_requests_matching_idx on public.service_requests(category_id, status, scheduled_at);
create table public.request_media (
  id uuid primary key default gen_random_uuid(), service_request_id uuid not null references public.service_requests(id) on delete cascade,
  storage_path text not null, content_type text not null, byte_size integer not null check (byte_size > 0 and byte_size <= 15728640), created_at timestamptz not null default now()
);
create table public.match_candidates (
  id uuid primary key default gen_random_uuid(), service_request_id uuid not null references public.service_requests(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(account_id) on delete restrict, score numeric(7,4) not null,
  rank integer not null check (rank > 0), factors jsonb not null default '{}', eligible boolean not null,
  created_at timestamptz not null default now(), unique(service_request_id, worker_id)
);
create index match_candidate_order_idx on public.match_candidates(service_request_id, eligible, rank);

create table public.bookings (
  id uuid primary key default gen_random_uuid(), service_request_id uuid not null references public.service_requests(id) on delete restrict,
  user_account_id uuid not null references public.user_profiles(account_id) on delete restrict,
  worker_account_id uuid not null references public.worker_profiles(account_id) on delete restrict,
  status public.booking_status not null default 'PENDING', version integer not null default 0 check (version >= 0),
  response_due_at timestamptz not null default (now() + interval '15 minutes'), accepted_at timestamptz,
  completed_at timestamptz, cancelled_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_active_booking_per_request on public.bookings(service_request_id) where status <> 'CANCELLED';
create index bookings_user_status_idx on public.bookings(user_account_id, status);
create index bookings_worker_status_idx on public.bookings(worker_account_id, status);
create table public.booking_status_events (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status public.booking_status, to_status public.booking_status not null, actor_id uuid not null references public.accounts(id) on delete restrict,
  reason text check (length(reason) <= 1000), created_at timestamptz not null default now()
);
create table public.cancellations (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null unique references public.bookings(id) on delete cascade,
  cancelled_by uuid not null references public.accounts(id) on delete restrict, reason text not null check (length(reason) between 3 and 1000),
  policy_version text not null, confirmed_at timestamptz not null default now()
);
create table public.location_updates (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict, latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180), recorded_at timestamptz not null default now()
);
create index location_updates_booking_time_idx on public.location_updates(booking_id, recorded_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null unique references public.bookings(id) on delete restrict,
  method public.payment_method not null check (method = 'CASH'), status public.payment_status not null default 'AWAITING_CONFIRMATIONS',
  service_amount numeric(12,2) not null check (service_amount > 0), commission_rate numeric(5,4) not null default 0.1000 check (commission_rate between 0 and 1),
  commission_amount numeric(12,2) not null, worker_net_amount numeric(12,2) not null, homeowner_platform_charge numeric(12,2) not null default 0,
  idempotency_key text not null unique check (length(idempotency_key) between 16 and 128), failure_reason text, successful_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.cash_confirmations (
  id uuid primary key default gen_random_uuid(), payment_id uuid not null references public.payments(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict, party public.cash_confirmation_party not null,
  confirmed_at timestamptz not null default now(), unique(payment_id, party)
);
create table public.receipts (
  id uuid primary key default gen_random_uuid(), payment_id uuid not null unique references public.payments(id) on delete restrict,
  receipt_number text not null unique, service_amount numeric(12,2) not null, commission_rate numeric(5,4) not null,
  commission_amount numeric(12,2) not null, worker_net_amount numeric(12,2) not null, homeowner_platform_charge numeric(12,2) not null,
  issued_at timestamptz not null default now()
);
create table public.refunds (
  id uuid primary key default gen_random_uuid(), payment_id uuid not null unique references public.payments(id) on delete restrict,
  status public.refund_status not null default 'PENDING', reason text not null check (length(reason) between 3 and 1000),
  decided_by uuid references public.accounts(id) on delete set null, decided_at timestamptz, created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null unique references public.bookings(id) on delete restrict,
  user_account_id uuid not null references public.user_profiles(account_id) on delete restrict,
  worker_account_id uuid not null references public.worker_profiles(account_id) on delete restrict,
  stars smallint not null check (stars between 1 and 5), body text not null check (length(body) between 3 and 4000),
  recommend_worker boolean not null, moderation_status public.review_moderation_status not null default 'PENDING',
  moderated_by uuid references public.accounts(id) on delete set null, moderated_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index reviews_worker_status_idx on public.reviews(worker_account_id, moderation_status);
create table public.review_media (
  id uuid primary key default gen_random_uuid(), review_id uuid not null references public.reviews(id) on delete cascade,
  storage_path text not null, content_type text not null, byte_size integer not null check (byte_size > 0 and byte_size <= 15728640)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(), booking_id uuid unique references public.bookings(id) on delete restrict,
  service_request_id uuid references public.service_requests(id) on delete restrict,
  worker_account_id uuid references public.worker_profiles(account_id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_preselection_conversation on public.conversations(service_request_id,worker_account_id) where booking_id is null;
create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade, joined_at timestamptz not null default now(),
  primary key(conversation_id, account_id)
);
create index conversation_participants_account_idx on public.conversation_participants(account_id);
create table public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.accounts(id) on delete restrict, body text check (length(body) <= 4000),
  original_locale text, created_at timestamptz not null default now(), check (body is not null or original_locale is null)
);
create index messages_conversation_time_idx on public.messages(conversation_id, created_at desc);
create table public.message_attachments (
  id uuid primary key default gen_random_uuid(), message_id uuid not null references public.messages(id) on delete cascade,
  kind text not null check (kind in ('IMAGE','LOCATION','VOICE')), storage_path text, location jsonb, content_type text,
  byte_size integer check (byte_size is null or byte_size between 1 and 15728640)
);
create table public.message_translations (
  id uuid primary key default gen_random_uuid(), message_id uuid not null references public.messages(id) on delete cascade,
  target_locale text not null, translated text not null, provider text not null, created_at timestamptz not null default now(),
  unique(message_id, target_locale)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), recipient_id uuid references public.accounts(id) on delete cascade,
  audience public.notification_audience, title text not null check (length(title) between 1 and 160), body text not null,
  category text not null, status public.notification_status not null default 'DRAFT', scheduled_at timestamptz, sent_at timestamptz,
  source_key text unique, read_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (recipient_id is not null or audience is not null)
);
create index notifications_recipient_time_idx on public.notifications(recipient_id, created_at desc);
create index notifications_schedule_idx on public.notifications(status, scheduled_at);
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.accounts(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete set null, subject text not null check (length(subject) between 3 and 200),
  description text not null check (length(description) between 10 and 4000), status public.ticket_status not null default 'OPEN',
  resolution text, escalated_at timestamptz, resolved_at timestamptz, closed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.content_pages (
  id uuid primary key default gen_random_uuid(), key public.content_key not null unique, title text not null,
  body text not null, version text not null, published_at timestamptz, updated_by uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.system_settings (
  key text primary key, value jsonb not null, updated_by uuid references public.accounts(id) on delete set null, updated_at timestamptz not null default now()
);
create table public.trash_entries (
  id uuid primary key default gen_random_uuid(), entity_type text not null, entity_id text not null, snapshot jsonb not null,
  deleted_by uuid not null references public.accounts(id) on delete restrict, deleted_at timestamptz not null default now(),
  restored_at timestamptz, restored_by uuid references public.accounts(id) on delete set null
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.accounts(id) on delete set null,
  action text not null, entity_type text, entity_id text, correlation_id text not null default gen_random_uuid()::text,
  metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create index audit_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create table public.report_exports (
  id uuid primary key default gen_random_uuid(), report_type text not null, parameters jsonb not null default '{}', storage_path text,
  status text not null check (status in ('QUEUED','PROCESSING','COMPLETED','FAILED')), requested_by uuid not null references public.accounts(id) on delete restrict,
  failure_reason text, created_at timestamptz not null default now(), completed_at timestamptz
);
create table public.favorites (
  user_account_id uuid not null references public.user_profiles(account_id) on delete cascade,
  worker_account_id uuid not null references public.worker_profiles(account_id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_account_id, worker_account_id)
);
create table public.job_failures (
  id uuid primary key default gen_random_uuid(), queue_name text not null, message_id bigint, payload jsonb not null,
  attempts integer not null, error text not null, failed_at timestamptz not null default now(), resolved_at timestamptz,
  resolved_by uuid references public.accounts(id) on delete set null
);
create unique index job_failures_queue_message_idx on public.job_failures(queue_name,message_id);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['accounts','user_profiles','worker_profiles','admin_profiles','worker_verifications','service_categories','addresses','service_requests','bookings','payments','reviews','conversations','notifications','support_tickets','content_pages'] loop execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t); end loop; end $$;

create or replace function public.current_role() returns public.account_role language sql stable security definer set search_path = '' as $$
  select role from public.accounts where id = auth.uid() and status = 'ACTIVE' and deleted_at is null
$$;
create or replace function public.is_admin(require_aal2 boolean default false) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'ADMIN' and status = 'ACTIVE' and deleted_at is null and (not require_aal2 or not mfa_enabled or coalesce(auth.jwt()->>'aal','aal1') = 'aal2') from public.accounts where id = auth.uid()), false)
$$;
create or replace function public.is_booking_party(target_booking uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.bookings where id = target_booking and (user_account_id = auth.uid() or worker_account_id = auth.uid())) or public.is_admin(false)
$$;
create or replace function public.is_conversation_participant(target_conversation uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.conversation_participants where conversation_id = target_conversation and account_id = auth.uid()) or public.is_admin(false)
$$;

create or replace function public.provision_account() returns trigger language plpgsql security definer set search_path = '' as $$
declare requested_role public.account_role; display_name text; mobile_value text; app_role text;
begin
  app_role := upper(coalesce(new.raw_app_meta_data->>'ayos_role',''));
  requested_role := (case when app_role='ADMIN' then app_role else upper(coalesce(new.raw_user_meta_data->>'role','')) end)::public.account_role;
  if requested_role not in ('USER','WORKER','ADMIN') then raise exception using errcode='42501', message='Invalid account role'; end if;
  if requested_role='ADMIN' and app_role<>'ADMIN' then raise exception using errcode='42501', message='Administrator self-registration is prohibited'; end if;
  if requested_role<>'ADMIN' and not exists(select 1 from public.content_pages where key='TERMS' and published_at is not null) then raise exception using errcode='P0001',message='Registration is unavailable until Terms are published'; end if;
  display_name := trim(coalesce(new.raw_user_meta_data->>'name',''));
  mobile_value := nullif(trim(coalesce(new.raw_user_meta_data->>'mobile','')), '');
  if length(display_name) < 2 then raise exception using errcode='22023', message='A valid display name is required'; end if;
  insert into public.accounts(id, role, status, email, mobile, is_protected)
  values(
    new.id,
    requested_role,
    case when requested_role='ADMIN' or new.email_confirmed_at is not null then 'ACTIVE'::public.account_status else 'PENDING_VERIFICATION'::public.account_status end,
    lower(new.email),
    mobile_value,
    requested_role='ADMIN'
  );
  if requested_role = 'USER' then insert into public.user_profiles(account_id, display_name) values(new.id, display_name);
  elsif requested_role = 'WORKER' then insert into public.worker_profiles(account_id, display_name) values(new.id, display_name);
  else insert into public.admin_profiles(account_id, display_name) values(new.id, display_name); end if;
  return new;
exception when invalid_text_representation then raise exception using errcode='42501', message='Invalid account role';
end $$;
create trigger provision_account_after_auth_insert after insert on auth.users for each row execute function public.provision_account();

create or replace function public.activate_confirmed_account() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.accounts set status='ACTIVE' where id=new.id and status='PENDING_VERIFICATION';
  end if;
  return new;
end $$;
create trigger activate_account_after_email_confirmation after update of email_confirmed_at on auth.users for each row execute function public.activate_confirmed_account();

create or replace function public.prevent_account_security_changes() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.role <> new.role then raise exception using errcode='42501', message='Account roles are immutable'; end if;
  if old.is_protected and new.deleted_at is not null then raise exception using errcode='42501', message='Protected administrators cannot be deleted'; end if;
  return new;
end $$;
create trigger protect_account before update on public.accounts for each row execute function public.prevent_account_security_changes();

comment on table public.accounts is 'FR-01–FR-09, FR-19, FR-49–FR-51, FR-89–FR-91, FR-99–FR-101';
comment on table public.bookings is 'FR-14–FR-18, FR-58–FR-62, FR-104';
comment on table public.payments is 'FR-25–FR-28, FR-73';
comment on table public.ai_analyses is 'FR-92–FR-98';
