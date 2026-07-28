-- A-YOS complete Supabase SQL Editor installer
-- Target: a NEW, EMPTY Supabase project only.
-- Generated from the authoritative migrations by scripts/build-sql-editor-installer.sh.
--
-- Run this file once from the Supabase Dashboard SQL Editor as the project owner.
-- The installer intentionally aborts if core A-YOS objects already exist.
-- It contains development placeholder legal/help content that must be replaced
-- before any production deployment.

begin;

do $preflight$
begin
  if to_regclass('public.accounts') is not null
     or exists (
       select 1
       from pg_type type_record
       join pg_namespace namespace_record
         on namespace_record.oid = type_record.typnamespace
       where namespace_record.nspname = 'public'
         and type_record.typname = 'account_role'
     )
     or to_regprocedure('public.current_role()') is not null then
    raise exception using
      errcode = 'P0001',
      message = 'A_YOS_INSTALL_TARGET_NOT_EMPTY',
      detail = 'Core A-YOS objects already exist in the public schema.',
      hint = 'Run this installer only on a new empty Supabase project. Use migrations for upgrades.';
  end if;
end
$preflight$;

-- ============================================================================
-- 1. Platform schema
-- Source: supabase/migrations/20260720000100_platform.sql
-- ============================================================================

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
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists provision_account_after_auth_insert on auth.users;
create trigger provision_account_after_auth_insert after insert on auth.users for each row execute function public.provision_account();

create or replace function public.activate_confirmed_account() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.accounts set status='ACTIVE' where id=new.id and status='PENDING_VERIFICATION';
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_confirmed on auth.users;
drop trigger if exists activate_account_after_email_confirmation on auth.users;
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

-- ============================================================================
-- 2. Domain RPCs
-- Source: supabase/migrations/20260720000200_domain_rpcs.sql
-- ============================================================================

-- Atomic domain commands. Direct table grants intentionally exclude these writes.
create or replace function public.create_service_request(
  category_id uuid, address_id uuid, description text, scheduled_at timestamptz,
  budget numeric, notes text default null, ai_analysis_id uuid default null,
  notify_on_match boolean default false
) returns public.service_requests language plpgsql security definer set search_path = '' as $$
declare result public.service_requests;
begin
  if public.current_role() <> 'USER' then raise exception using errcode='42501', message='USER role required'; end if;
  if not exists(select 1 from public.content_pages where key='TERMS' and published_at is not null) then raise exception using errcode='P0001', message='CONTENT_NOT_CONFIGURED'; end if;
  if not exists(select 1 from public.addresses where id = address_id and account_id = auth.uid()) then raise exception using errcode='42501', message='Address is unavailable'; end if;
  if scheduled_at <= now() or budget <= 0 or length(trim(description)) not between 10 and 4000 then raise exception using errcode='22023', message='Invalid service request'; end if;
  insert into public.service_requests(user_account_id, category_id, address_id, description, scheduled_at, budget, notes, ai_analysis_id, notify_on_match, status)
  values(auth.uid(), category_id, address_id, trim(description), scheduled_at, round(budget,2), nullif(trim(notes),''), ai_analysis_id, notify_on_match, 'OPEN') returning * into result;
  return result;
end $$;

create or replace function public.select_worker(p_service_request_id uuid, p_worker_id uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare request public.service_requests; result public.bookings; conversation_id uuid;
begin
  select * into request from public.service_requests where id = p_service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') then raise exception using errcode='42501', message='Service request cannot be selected'; end if;
  if not exists(select 1 from public.worker_profiles wp join public.worker_skills ws on ws.worker_id=wp.account_id where wp.account_id=p_worker_id and wp.approval_status='APPROVED' and wp.is_available and ws.category_id=request.category_id) then raise exception using errcode='P0001', message='WORKER_UNAVAILABLE'; end if;
  insert into public.bookings(service_request_id,user_account_id,worker_account_id) values(request.id,auth.uid(),p_worker_id) returning * into result;
  insert into public.booking_status_events(booking_id,to_status,actor_id) values(result.id,'PENDING',auth.uid());
  insert into public.conversations(booking_id) values(result.id) returning id into conversation_id;
  insert into public.conversation_participants(conversation_id,account_id) values(conversation_id,auth.uid()),(conversation_id,p_worker_id);
  update public.service_requests set status='BOOKED', selected_worker_id=p_worker_id where id=request.id;
  perform pgmq.send('booking_timeouts', jsonb_build_object('booking_id',result.id,'due_at',result.response_due_at,'attempt',0));
  return result;
end $$;

create or replace function public.generate_matches(p_service_request_id uuid)
returns setof public.match_candidates language plpgsql security definer set search_path='' as $$
declare request public.service_requests; matched_count integer;
begin
  select * into request from public.service_requests where id=p_service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') then raise exception using errcode='42501',message='Service request unavailable'; end if;
  delete from public.match_candidates where service_request_id=request.id;
  insert into public.match_candidates(service_request_id,worker_id,score,rank,factors,eligible)
  select request.id, ranked.worker_id, ranked.score, ranked.rank,
    jsonb_build_object('category',true,'available',true,'years',ranked.years,'rating',ranked.rating,'recommendation_priority',ranked.recommendation_priority),true
  from (
    select wp.account_id worker_id, ws.years, coalesce(avg(r.stars) filter(where r.moderation_status='PUBLISHED'),0)::numeric(3,2) rating,
      wp.recommendation_priority,
      (ws.years*5 + coalesce(avg(r.stars) filter(where r.moderation_status='PUBLISHED'),0)*10 + case when wp.recommendation_priority then 0.01 else 0 end)::numeric(7,4) score,
      row_number() over(order by ws.years*5 + coalesce(avg(r.stars) filter(where r.moderation_status='PUBLISHED'),0)*10 desc,wp.recommendation_priority desc,wp.account_id)::integer rank
    from public.worker_profiles wp join public.worker_skills ws on ws.worker_id=wp.account_id
    left join public.reviews r on r.worker_account_id=wp.account_id
    where ws.category_id=request.category_id and wp.approval_status='APPROVED' and wp.is_available
      and exists(select 1 from public.worker_availability wa where wa.worker_id=wp.account_id and wa.day_of_week=extract(dow from request.scheduled_at)::integer and request.scheduled_at::time between wa.start_time and wa.end_time)
    group by wp.account_id,ws.years,wp.recommendation_priority
  ) ranked where ranked.rank <= 5;
  get diagnostics matched_count=row_count;
  if matched_count>0 then update public.service_requests set status='MATCHED' where id=request.id;
  else perform pgmq.send('no_match_notifications',jsonb_build_object('service_request_id',request.id,'user_account_id',request.user_account_id),300); end if;
  return query select * from public.match_candidates where public.match_candidates.service_request_id=request.id order by rank;
end $$;

create or replace function public.start_worker_conversation(p_service_request_id uuid, p_worker_id uuid)
returns public.conversations language plpgsql security definer set search_path='' as $$
declare result public.conversations;
begin
  if not exists(select 1 from public.service_requests r where r.id=p_service_request_id and r.user_account_id=auth.uid() and r.status in ('OPEN','MATCHED'))
    or not exists(select 1 from public.match_candidates m where m.service_request_id=p_service_request_id and m.worker_id=p_worker_id and m.eligible) then
    raise exception using errcode='42501',message='Conversation is unavailable'; end if;
  insert into public.conversations(service_request_id,worker_account_id) values(p_service_request_id,p_worker_id)
  on conflict(service_request_id,worker_account_id) where booking_id is null do update set updated_at=now() returning * into result;
  insert into public.conversation_participants(conversation_id,account_id) values(result.id,auth.uid()),(result.id,p_worker_id) on conflict do nothing;
  return result;
end $$;

create or replace function public.transition_booking(p_booking_id uuid, p_target_status public.booking_status, p_expected_version integer, p_reason text default null)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare booking public.bookings; allowed boolean := false; result public.bookings;
begin
  select * into booking from public.bookings b where b.id=p_booking_id for update;
  if booking.id is null or not public.is_booking_party(p_booking_id) then raise exception using errcode='42501', message='Booking unavailable'; end if;
  if booking.version <> p_expected_version then raise exception using errcode='40001', message='BOOKING_VERSION_CONFLICT'; end if;
  allowed := case booking.status
    when 'PENDING' then p_target_status in ('ACCEPTED','CANCELLED')
    when 'ACCEPTED' then p_target_status in ('WORKER_PREPARING','CANCELLED')
    when 'WORKER_PREPARING' then p_target_status in ('WORKER_EN_ROUTE','CANCELLED')
    when 'WORKER_EN_ROUTE' then p_target_status in ('WORKER_ARRIVED','CANCELLED')
    when 'WORKER_ARRIVED' then p_target_status in ('SERVICE_STARTED','CANCELLED')
    when 'SERVICE_STARTED' then p_target_status in ('IN_PROGRESS','CANCELLED')
    when 'IN_PROGRESS' then p_target_status in ('COMPLETED','CANCELLED') else false end;
  if not allowed then raise exception using errcode='P0001', message='INVALID_BOOKING_TRANSITION'; end if;
  if p_target_status not in ('CANCELLED') and auth.uid() <> booking.worker_account_id and not public.is_admin(true) then raise exception using errcode='42501', message='Worker or administrator required'; end if;
  if p_target_status='CANCELLED' and (p_reason is null or length(trim(p_reason)) < 3) then raise exception using errcode='22023', message='Cancellation reason required'; end if;
  if p_target_status='ACCEPTED' and auth.uid() <> booking.worker_account_id then raise exception using errcode='42501', message='Assigned worker required'; end if;
  update public.bookings set status=p_target_status, version=version+1,
    accepted_at=case when p_target_status='ACCEPTED' then now() else accepted_at end,
    completed_at=case when p_target_status='COMPLETED' then now() else completed_at end,
    cancelled_at=case when p_target_status='CANCELLED' then now() else cancelled_at end
  where id=booking.id returning * into result;
  insert into public.booking_status_events(booking_id,from_status,to_status,actor_id,reason) values(booking.id,booking.status,p_target_status,auth.uid(),nullif(trim(p_reason),''));
  if p_target_status='CANCELLED' then
    insert into public.cancellations(booking_id,cancelled_by,reason,policy_version)
    values(booking.id,auth.uid(),trim(p_reason),(select version from public.content_pages where key='REFUND_POLICY' and published_at is not null))
    on conflict on constraint cancellations_booking_id_key do nothing;
    update public.service_requests set status='OPEN',selected_worker_id=null where id=booking.service_request_id;
  elsif p_target_status='COMPLETED' then update public.service_requests set status='CLOSED' where id=booking.service_request_id; end if;
  return result;
end $$;

create or replace function public.record_worker_location(booking_id uuid, latitude numeric, longitude numeric)
returns public.location_updates language plpgsql security definer set search_path = '' as $$
declare booking public.bookings; result public.location_updates;
begin
  select * into booking from public.bookings where id=booking_id;
  if booking.worker_account_id is distinct from auth.uid() or booking.status not in ('WORKER_EN_ROUTE','WORKER_ARRIVED','SERVICE_STARTED','IN_PROGRESS') then raise exception using errcode='42501', message='Location update not allowed'; end if;
  if latitude not between -90 and 90 or longitude not between -180 and 180 then raise exception using errcode='22023', message='Invalid coordinates'; end if;
  insert into public.location_updates(booking_id,account_id,latitude,longitude) values(booking.id,auth.uid(),latitude,longitude) returning * into result;
  return result;
end $$;

create or replace function public.confirm_cash_payment(p_booking_id uuid, p_idempotency_key text)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare booking public.bookings; payment public.payments; confirmation_party public.cash_confirmation_party; amount numeric(12,2); rate numeric(5,4); commission numeric(12,2);
begin
  select * into booking from public.bookings where id=p_booking_id for update;
  if booking.status <> 'COMPLETED' or auth.uid() not in (booking.user_account_id,booking.worker_account_id) then raise exception using errcode='42501', message='Cash confirmation not allowed'; end if;
  if length(p_idempotency_key) not between 16 and 128 then raise exception using errcode='22023', message='Invalid idempotency key'; end if;
  amount := (select budget from public.service_requests where id=booking.service_request_id); rate := 0.1000; commission := round(amount*rate,2);
  insert into public.payments(booking_id,method,status,service_amount,commission_rate,commission_amount,worker_net_amount,idempotency_key)
  values(booking.id,'CASH','AWAITING_CONFIRMATIONS',amount,rate,commission,amount-commission,p_idempotency_key)
  on conflict(booking_id) do update set updated_at=now() returning * into payment;
  confirmation_party := case when auth.uid()=booking.user_account_id then 'USER'::public.cash_confirmation_party else 'WORKER'::public.cash_confirmation_party end;
  insert into public.cash_confirmations(payment_id,account_id,party) values(payment.id,auth.uid(),confirmation_party) on conflict(payment_id,party) do nothing;
  if (select count(*) from public.cash_confirmations where payment_id=payment.id)=2 then
    update public.payments set status='SUCCESSFUL',successful_at=coalesce(successful_at,now()) where id=payment.id returning * into payment;
    insert into public.receipts(payment_id,receipt_number,service_amount,commission_rate,commission_amount,worker_net_amount,homeowner_platform_charge)
    values(payment.id,'AYOS-'||upper(substr(replace(payment.id::text,'-',''),1,12)),payment.service_amount,payment.commission_rate,payment.commission_amount,payment.worker_net_amount,payment.homeowner_platform_charge) on conflict(payment_id) do nothing;
  end if;
  return payment;
end $$;

create or replace function public.create_review(p_booking_id uuid, stars integer, body text, recommend_worker boolean)
returns public.reviews language plpgsql security definer set search_path = '' as $$
declare booking public.bookings; result public.reviews;
begin
  select * into booking from public.bookings where id=p_booking_id;
  if booking.user_account_id is distinct from auth.uid() or booking.status <> 'COMPLETED' or not exists(select 1 from public.payments where booking_id=booking.id and status='SUCCESSFUL') then raise exception using errcode='42501', message='REVIEW_NOT_ALLOWED'; end if;
  if stars not between 1 and 5 or length(trim(body)) not between 3 and 4000 then raise exception using errcode='22023', message='Invalid review'; end if;
  insert into public.reviews(booking_id,user_account_id,worker_account_id,stars,body,recommend_worker)
  values(booking.id,booking.user_account_id,booking.worker_account_id,stars,trim(body),recommend_worker) returning * into result;
  return result;
end $$;

create or replace function public.review_worker_verification(verification_id uuid, decision public.worker_approval_status, notes text default null)
returns public.worker_verifications language plpgsql security definer set search_path = '' as $$
declare verification public.worker_verifications; result public.worker_verifications;
begin
  if not public.is_admin(true) or decision not in ('APPROVED','NEEDS_DOCUMENTS','REJECTED') then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  select * into verification from public.worker_verifications where id=verification_id for update;
  update public.worker_verifications set status=decision,requested_notes=notes,reviewed_by=auth.uid(),reviewed_at=now() where id=verification.id returning * into result;
  update public.worker_profiles set approval_status=decision,approved_at=case when decision='APPROVED' then now() else null end,is_available=case when decision='APPROVED' then is_available else false end where account_id=verification.worker_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'WORKER_VERIFICATION_REVIEWED','worker_verification',verification.id::text,jsonb_build_object('decision',decision));
  return result;
end $$;

create or replace function public.set_account_status(account_id uuid, next_status public.account_status)
returns public.accounts language plpgsql security definer set search_path = '' as $$
declare result public.accounts;
begin
  if not public.is_admin(true) then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  update public.accounts set status=next_status where id=account_id returning * into result;
  if result.id is null then raise exception using errcode='P0002', message='Account not found'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'ACCOUNT_STATUS_CHANGED','account',account_id::text,jsonb_build_object('status',next_status));
  return result;
end $$;

create or replace function public.set_recommendation_priority(worker_id uuid, enabled boolean)
returns public.worker_profiles language plpgsql security definer set search_path = '' as $$
declare result public.worker_profiles;
begin
  if not public.is_admin(true) then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  update public.worker_profiles set recommendation_priority=enabled where account_id=worker_id returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'RECOMMENDATION_PRIORITY_CHANGED','worker',worker_id::text,jsonb_build_object('enabled',enabled));
  return result;
end $$;

create or replace function public.decide_refund(p_refund_id uuid, p_decision public.refund_status, p_reason text)
returns public.refunds language plpgsql security definer set search_path = '' as $$
declare result public.refunds;
begin
  if not public.is_admin(true) or p_decision not in ('PROCESSED','REJECTED') then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  update public.refunds r set status=p_decision,reason=trim(p_reason),decided_by=auth.uid(),decided_at=now() where r.id=p_refund_id and r.status='PENDING' returning * into result;
  if result.id is null then raise exception using errcode='P0001', message='REFUND_DECISION_NOT_ALLOWED'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'REFUND_DECIDED','refund',p_refund_id::text,jsonb_build_object('decision',p_decision));
  return result;
end $$;

create or replace function public.move_to_trash(entity_type text, entity_id text, snapshot jsonb)
returns public.trash_entries language plpgsql security definer set search_path = '' as $$
declare result public.trash_entries;
begin
  if not public.is_admin(true) then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  insert into public.trash_entries(entity_type,entity_id,snapshot,deleted_by) values(entity_type,entity_id,snapshot,auth.uid()) returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'MOVED_TO_TRASH',entity_type,entity_id);
  return result;
end $$;
create or replace function public.restore_from_trash(trash_id uuid) returns public.trash_entries language plpgsql security definer set search_path = '' as $$
declare result public.trash_entries;
begin
  if not public.is_admin(true) then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  update public.trash_entries set restored_at=now(),restored_by=auth.uid() where id=trash_id and restored_at is null returning * into result;
  if result.id is null then raise exception using errcode='P0001', message='RESTORE_NOT_ALLOWED'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'RESTORED_FROM_TRASH',result.entity_type,result.entity_id);
  return result;
end $$;
create or replace function public.permanently_delete(trash_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.is_admin(true) then insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'PERMANENT_DELETION_BLOCKED','trash_entry',trash_id::text,'{}'); end if;
  raise exception using errcode='42501', message='PERMANENT_DELETION_BLOCKED';
end $$;

revoke all on function public.create_service_request(uuid,uuid,text,timestamptz,numeric,text,uuid,boolean) from public;
grant execute on function public.create_service_request(uuid,uuid,text,timestamptz,numeric,text,uuid,boolean) to authenticated;
grant execute on all functions in schema public to authenticated;

-- ============================================================================
-- 3. Security, Realtime, Storage, and background jobs
-- Source: supabase/migrations/20260720000300_security_realtime_jobs.sql
-- ============================================================================

-- RLS, direct-access grants, private Storage, Realtime, and background jobs.
do $$ declare t text; begin
  foreach t in array array[
    'accounts','user_profiles','worker_profiles','admin_profiles','worker_verifications','worker_availability','service_categories','worker_skills','addresses',
    'ai_analyses','service_requests','request_media','match_candidates','bookings','booking_status_events','cancellations','location_updates',
    'payments','cash_confirmations','receipts','refunds','reviews','review_media','conversations','conversation_participants','messages',
    'message_attachments','message_translations','notifications','support_tickets','content_pages','system_settings','trash_entries','audit_logs',
    'report_exports','favorites','job_failures'
  ] loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.service_categories, public.content_pages to anon;
grant select on all tables in schema public to authenticated;
grant update(display_name,avatar_path,notification_preferences) on public.user_profiles to authenticated;
grant update(display_name,avatar_path,bio,experience,service_area,latitude,longitude,is_available) on public.worker_profiles to authenticated;
grant insert, update, delete on public.worker_availability, public.worker_skills, public.addresses, public.favorites to authenticated;
grant insert on public.worker_verifications to authenticated;
grant update(identity_data,document_paths) on public.worker_verifications to authenticated;
grant insert on public.messages, public.message_attachments, public.support_tickets to authenticated;
grant update(read_at) on public.notifications to authenticated;

create policy accounts_self_or_admin_read on public.accounts for select to authenticated using(id=auth.uid() or public.is_admin(false));
create policy user_profile_self_or_admin_read on public.user_profiles for select to authenticated using(account_id=auth.uid() or public.is_admin(false));
create policy user_profile_self_update on public.user_profiles for update to authenticated using(account_id=auth.uid()) with check(account_id=auth.uid());
create policy worker_profile_discovery_read on public.worker_profiles for select to authenticated using(approval_status='APPROVED' or account_id=auth.uid() or public.is_admin(false));
create policy worker_profile_self_update on public.worker_profiles for update to authenticated using(account_id=auth.uid()) with check(account_id=auth.uid() and (approval_status='APPROVED' or not is_available));
create policy admin_profile_self_or_admin on public.admin_profiles for select to authenticated using(account_id=auth.uid() or public.is_admin(false));

create policy verification_owner_or_admin_read on public.worker_verifications for select to authenticated using(worker_id=auth.uid() or public.is_admin(false));
create policy verification_owner_insert on public.worker_verifications for insert to authenticated with check(worker_id=auth.uid() and public.current_role()='WORKER' and status='PENDING');
create policy verification_owner_pending_update on public.worker_verifications for update to authenticated using(worker_id=auth.uid() and status in ('PENDING','NEEDS_DOCUMENTS')) with check(worker_id=auth.uid() and status in ('PENDING','NEEDS_DOCUMENTS'));
create policy availability_read on public.worker_availability for select to authenticated using(true);
create policy availability_owner_write on public.worker_availability for all to authenticated using(worker_id=auth.uid()) with check(worker_id=auth.uid());
create policy categories_public_read on public.service_categories for select to anon, authenticated using(is_active or public.is_admin(false));
create policy skills_read on public.worker_skills for select to authenticated using(true);
create policy skills_owner_write on public.worker_skills for all to authenticated using(worker_id=auth.uid()) with check(worker_id=auth.uid());
create policy addresses_owner_or_admin_read on public.addresses for select to authenticated using(account_id=auth.uid() or public.is_admin(false));
create policy addresses_owner_write on public.addresses for all to authenticated using(account_id=auth.uid()) with check(account_id=auth.uid());

create policy analyses_owner_or_admin on public.ai_analyses for select to authenticated using(account_id=auth.uid() or public.is_admin(false));
create policy requests_authorized_read on public.service_requests for select to authenticated using(user_account_id=auth.uid() or selected_worker_id=auth.uid() or public.is_admin(false));
create policy request_media_authorized_read on public.request_media for select to authenticated using(exists(select 1 from public.service_requests r where r.id=service_request_id and (r.user_account_id=auth.uid() or r.selected_worker_id=auth.uid())) or public.is_admin(false));
create policy matches_authorized_read on public.match_candidates for select to authenticated using(worker_id=auth.uid() or exists(select 1 from public.service_requests r where r.id=service_request_id and r.user_account_id=auth.uid()) or public.is_admin(false));
create policy bookings_party_or_admin_read on public.bookings for select to authenticated using(public.is_booking_party(id));
create policy booking_events_party_or_admin_read on public.booking_status_events for select to authenticated using(public.is_booking_party(booking_id));
create policy cancellations_party_or_admin_read on public.cancellations for select to authenticated using(public.is_booking_party(booking_id));
create policy locations_party_or_admin_read on public.location_updates for select to authenticated using(public.is_booking_party(booking_id));

create policy payments_party_or_admin_read on public.payments for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and public.is_booking_party(b.id)));
create policy confirmations_party_or_admin_read on public.cash_confirmations for select to authenticated using(exists(select 1 from public.payments p where p.id=payment_id and public.is_booking_party(p.booking_id)));
create policy receipts_party_or_admin_read on public.receipts for select to authenticated using(exists(select 1 from public.payments p where p.id=payment_id and public.is_booking_party(p.booking_id)));
create policy refunds_party_or_admin_read on public.refunds for select to authenticated using(exists(select 1 from public.payments p where p.id=payment_id and public.is_booking_party(p.booking_id)));
create policy reviews_visible_read on public.reviews for select to authenticated using(moderation_status='PUBLISHED' or user_account_id=auth.uid() or worker_account_id=auth.uid() or public.is_admin(false));
create policy review_media_visible_read on public.review_media for select to authenticated using(exists(select 1 from public.reviews r where r.id=review_id and (r.moderation_status='PUBLISHED' or r.user_account_id=auth.uid() or r.worker_account_id=auth.uid())) or public.is_admin(false));

create policy conversations_member_read on public.conversations for select to authenticated using(public.is_conversation_participant(id));
create policy participants_member_read on public.conversation_participants for select to authenticated using(public.is_conversation_participant(conversation_id));
create policy messages_member_read on public.messages for select to authenticated using(public.is_conversation_participant(conversation_id));
create policy messages_member_insert on public.messages for insert to authenticated with check(sender_id=auth.uid() and public.is_conversation_participant(conversation_id));
create policy attachments_member_read on public.message_attachments for select to authenticated using(exists(select 1 from public.messages m where m.id=message_id and public.is_conversation_participant(m.conversation_id)));
create policy attachments_sender_insert on public.message_attachments for insert to authenticated with check(exists(select 1 from public.messages m where m.id=message_id and m.sender_id=auth.uid() and public.is_conversation_participant(m.conversation_id)));
create policy translations_member_read on public.message_translations for select to authenticated using(exists(select 1 from public.messages m where m.id=message_id and public.is_conversation_participant(m.conversation_id)));

create policy notifications_recipient_read on public.notifications for select to authenticated using(recipient_id=auth.uid() or (audience='EVERYONE') or (audience='USERS' and public.current_role()='USER') or (audience='WORKERS' and public.current_role()='WORKER') or public.is_admin(false));
create policy notifications_recipient_update on public.notifications for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());
create policy tickets_owner_or_admin_read on public.support_tickets for select to authenticated using(owner_id=auth.uid() or public.is_admin(false));
create policy tickets_owner_insert on public.support_tickets for insert to authenticated with check(owner_id=auth.uid());
create policy content_published_read on public.content_pages for select to anon, authenticated using(published_at is not null or public.is_admin(false));
create policy settings_admin_read on public.system_settings for select to authenticated using(public.is_admin(false));
create policy trash_admin_read on public.trash_entries for select to authenticated using(public.is_admin(true));
create policy audit_admin_read on public.audit_logs for select to authenticated using(public.is_admin(true));
create policy exports_admin_read on public.report_exports for select to authenticated using(public.is_admin(true));
create policy favorites_owner_read on public.favorites for select to authenticated using(user_account_id=auth.uid());
create policy favorites_owner_write on public.favorites for all to authenticated using(user_account_id=auth.uid()) with check(user_account_id=auth.uid());
create policy job_failures_admin_read on public.job_failures for select to authenticated using(public.is_admin(true));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('request-media','request-media',false,15728640,array['image/jpeg','image/png','image/webp']),
 ('verification-documents','verification-documents',false,15728640,array['image/jpeg','image/png','application/pdf']),
 ('message-attachments','message-attachments',false,15728640,array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/wav']),
 ('review-media','review-media',false,15728640,array['image/jpeg','image/png','image/webp']),
 ('profile-images','profile-images',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('report-exports','report-exports',false,52428800,array['text/csv','application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy storage_owner_upload on storage.objects for insert to authenticated with check(bucket_id in ('request-media','verification-documents','message-attachments','review-media','profile-images') and (storage.foldername(name))[1]=auth.uid()::text);
create policy storage_owner_update on storage.objects for update to authenticated using(owner_id=auth.uid()::text) with check(owner_id=auth.uid()::text);
create policy storage_owner_delete on storage.objects for delete to authenticated using(owner_id=auth.uid()::text);
create policy storage_authorized_read on storage.objects for select to authenticated using(
  owner_id=auth.uid()::text
  or public.is_admin(false)
  or (bucket_id='message-attachments' and exists(
    select 1 from public.message_attachments a join public.messages m on m.id=a.message_id
    where a.storage_path=name and public.is_conversation_participant(m.conversation_id)
  ))
  or (bucket_id='request-media' and exists(
    select 1 from public.request_media rm join public.service_requests sr on sr.id=rm.service_request_id
    where rm.storage_path=name and (sr.user_account_id=auth.uid() or sr.selected_worker_id=auth.uid())
  ))
  or (bucket_id='review-media' and exists(
    select 1 from public.review_media media join public.reviews review on review.id=media.review_id
    where media.storage_path=name and (review.user_account_id=auth.uid() or (review.worker_account_id=auth.uid() and review.moderation_status='PUBLISHED'))
  ))
);
create policy report_exports_admin_storage on storage.objects for all to authenticated using(bucket_id='report-exports' and public.is_admin(true)) with check(bucket_id='report-exports' and public.is_admin(true));

-- Supabase owns and already enables RLS on realtime.messages. Hosted projects
-- allow application policies here but reject ALTER TABLE ownership operations.
create policy realtime_booking_read on realtime.messages for select to authenticated using(
  extension='broadcast' and split_part(realtime.topic(),':',1)='booking' and public.is_booking_party(split_part(realtime.topic(),':',2)::uuid)
);
create policy realtime_conversation_read on realtime.messages for select to authenticated using(
  extension='broadcast' and split_part(realtime.topic(),':',1)='conversation' and public.is_conversation_participant(split_part(realtime.topic(),':',2)::uuid)
);
create policy realtime_notification_read on realtime.messages for select to authenticated using(
  extension='broadcast' and realtime.topic()='user:'||auth.uid()::text||':notifications'
);

create or replace function public.broadcast_application_change() returns trigger language plpgsql security definer set search_path='' as $$
declare topic text;
begin
  if tg_table_name='bookings' then topic := 'booking:'||new.id::text||':status';
  elsif tg_table_name='location_updates' then topic := 'booking:'||new.booking_id::text||':location';
  elsif tg_table_name='messages' then topic := 'conversation:'||new.conversation_id::text||':messages';
  elsif tg_table_name='notifications' and new.recipient_id is not null then topic := 'user:'||new.recipient_id::text||':notifications';
  end if;
  if topic is not null then perform realtime.broadcast_changes(topic,tg_op,tg_op,tg_table_name,tg_table_schema,new,old); end if;
  return coalesce(new,old);
end $$;
create trigger broadcast_booking_change after insert or update on public.bookings for each row execute function public.broadcast_application_change();
create trigger broadcast_location_change after insert on public.location_updates for each row execute function public.broadcast_application_change();
create trigger broadcast_message_change after insert on public.messages for each row execute function public.broadcast_application_change();
create trigger broadcast_notification_change after insert or update on public.notifications for each row execute function public.broadcast_application_change();

select pgmq.create('booking_timeouts');
select pgmq.create('no_match_notifications');
select pgmq.create('scheduled_notifications');
select pgmq.create('provider_work');

create or replace function private.invoke_queue_consumer() returns void language plpgsql security definer set search_path='' as $$
declare project_url text; invocation_secret text;
begin
  select decrypted_secret into project_url from vault.decrypted_secrets where name='project_url' limit 1;
  select decrypted_secret into invocation_secret from vault.decrypted_secrets where name='queue_consumer_secret' limit 1;
  if project_url is null or invocation_secret is null then return; end if;
  perform net.http_post(url:=project_url||'/functions/v1/queue-consumer',headers:=jsonb_build_object('content-type','application/json','x-ayos-queue-secret',invocation_secret),body:='{}'::jsonb,timeout_milliseconds:=10000);
end $$;
select cron.schedule('ayos-queue-consumer','* * * * *','select private.invoke_queue_consumer()');

-- ============================================================================
-- 4. Administrator and queue RPCs
-- Source: supabase/migrations/20260720000400_admin_and_queue_rpcs.sql
-- ============================================================================

alter table public.booking_status_events alter column actor_id drop not null;

create or replace function public.admin_upsert_content(content_key public.content_key, title text, body text, version text, publish boolean)
returns public.content_pages language plpgsql security definer set search_path='' as $$
declare result public.content_pages;
begin
  if not public.is_admin(true) then raise exception using errcode='42501',message='AAL2 administrator required'; end if;
  insert into public.content_pages(key,title,body,version,published_at,updated_by)
  values(content_key,trim(title),body,trim(version),case when publish then now() else null end,auth.uid())
  on conflict(key) do update set title=excluded.title,body=excluded.body,version=excluded.version,published_at=excluded.published_at,updated_by=auth.uid()
  returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'CONTENT_UPDATED','content_page',result.id::text);
  return result;
end $$;

create or replace function public.set_admin_mfa_enabled(enabled boolean) returns public.accounts language plpgsql security definer set search_path='' as $$
declare result public.accounts;
begin
  if public.current_role() <> 'ADMIN' or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then raise exception using errcode='42501',message='AAL2 administrator required'; end if;
  update public.accounts set mfa_enabled=enabled where id=auth.uid() returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'ADMIN_MFA_CHANGED','account',auth.uid()::text,jsonb_build_object('enabled',enabled));
  return result;
end $$;

create or replace function public.admin_set_setting(setting_key text, setting_value jsonb)
returns public.system_settings language plpgsql security definer set search_path='' as $$
declare result public.system_settings;
begin
  if not public.is_admin(true) then raise exception using errcode='42501',message='AAL2 administrator required'; end if;
  insert into public.system_settings(key,value,updated_by) values(setting_key,setting_value,auth.uid())
  on conflict(key) do update set value=excluded.value,updated_by=auth.uid(),updated_at=now() returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'SETTING_UPDATED','system_setting',setting_key);
  return result;
end $$;

create or replace function public.moderate_review(review_id uuid, decision public.review_moderation_status)
returns public.reviews language plpgsql security definer set search_path='' as $$
declare result public.reviews;
begin
  if not public.is_admin(true) or decision not in ('PUBLISHED','REJECTED') then raise exception using errcode='42501',message='AAL2 administrator required'; end if;
  update public.reviews set moderation_status=decision,moderated_by=auth.uid(),moderated_at=now() where id=review_id returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'REVIEW_MODERATED','review',review_id::text,jsonb_build_object('decision',decision));
  return result;
end $$;

create or replace function public.update_support_ticket(p_ticket_id uuid, p_next_status public.ticket_status, p_resolution text default null)
returns public.support_tickets language plpgsql security definer set search_path='' as $$
declare result public.support_tickets;
begin
  if not public.is_admin(true) then raise exception using errcode='42501',message='AAL2 administrator required'; end if;
  update public.support_tickets t set status=p_next_status,resolution=p_resolution,
    escalated_at=case when p_next_status='ESCALATED' then now() else t.escalated_at end,
    resolved_at=case when p_next_status='RESOLVED' then now() else t.resolved_at end,
    closed_at=case when p_next_status='CLOSED' then now() else t.closed_at end
  where t.id=p_ticket_id returning * into result;
  return result;
end $$;

create or replace function public.read_job_batch(queue_name text, visibility_seconds integer default 60, batch_size integer default 10)
returns setof jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.role() <> 'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
  return query execute format('select to_jsonb(x) from pgmq.read(%L,%s,%s) x',queue_name,greatest(visibility_seconds,10),least(greatest(batch_size,1),100));
end $$;
create or replace function public.archive_job(queue_name text, message_id bigint) returns boolean language plpgsql security definer set search_path='' as $$
declare archived boolean;
begin
  if auth.role() <> 'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
  execute format('select pgmq.archive(%L,%s)',queue_name,message_id) into archived; return archived;
end $$;
create or replace function public.expire_booking_request(target_booking uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare booking public.bookings;
begin
  if auth.role() <> 'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
  select * into booking from public.bookings where id=target_booking for update;
  if booking.status <> 'PENDING' or booking.response_due_at > now() then return false; end if;
  update public.bookings set status='CANCELLED',cancelled_at=now(),version=version+1 where id=booking.id;
  insert into public.booking_status_events(booking_id,from_status,to_status,reason) values(booking.id,'PENDING','CANCELLED','Booking response timed out');
  update public.service_requests set status='OPEN',selected_worker_id=null,notify_on_match=true where id=booking.service_request_id;
  insert into public.notifications(recipient_id,title,body,category,status,sent_at) values(booking.user_account_id,'Worker response timed out','Choose another recommended worker.','BOOKING','SENT',now());
  return true;
end $$;

revoke execute on function public.read_job_batch(text,integer,integer), public.archive_job(text,bigint), public.expire_booking_request(uuid) from public, anon, authenticated;
grant execute on function public.read_job_batch(text,integer,integer), public.archive_job(text,bigint), public.expire_booking_request(uuid) to service_role;
grant execute on function public.admin_upsert_content(public.content_key,text,text,text,boolean), public.admin_set_setting(text,jsonb), public.moderate_review(uuid,public.review_moderation_status), public.update_support_ticket(uuid,public.ticket_status,text), public.set_admin_mfa_enabled(boolean) to authenticated;

-- PostgreSQL grants function execution to PUBLIC by default. Remove that implicit
-- access so exposed RPCs are callable only by roles granted explicitly above or
-- by the authenticated grants established in the domain migration.
revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_admin(boolean), public.current_role() to anon;

-- ============================================================================
-- 5. PostGIS geospatial and AI support
-- Source: supabase/migrations/20260720000500_geospatial_ai.sql
-- ============================================================================

-- PostGIS-backed discovery/tracking and AI provider auditability.
-- FR-10–FR-13, FR-33–FR-44, FR-77, FR-92–FR-98; NFR-04–NFR-18.
create extension if not exists postgis with schema extensions;

alter table public.worker_profiles
  drop column latitude,
  drop column longitude,
  add column service_origin extensions.geography(point, 4326),
  add column service_radius_meters integer check (service_radius_meters between 100 and 200000),
  add column latitude numeric(9,6) generated always as
    (round(extensions.st_y(service_origin::extensions.geometry)::numeric, 6)) stored,
  add column longitude numeric(9,6) generated always as
    (round(extensions.st_x(service_origin::extensions.geometry)::numeric, 6)) stored;

alter table public.addresses
  drop column latitude,
  drop column longitude,
  add column location extensions.geography(point, 4326),
  add column latitude numeric(9,6) generated always as
    (round(extensions.st_y(location::extensions.geometry)::numeric, 6)) stored,
  add column longitude numeric(9,6) generated always as
    (round(extensions.st_x(location::extensions.geometry)::numeric, 6)) stored;

alter table public.service_requests
  add column service_location extensions.geography(point, 4326) not null;

alter table public.location_updates
  drop column latitude,
  drop column longitude,
  add column location extensions.geography(point, 4326) not null,
  add column latitude numeric(9,6) generated always as
    (round(extensions.st_y(location::extensions.geometry)::numeric, 6)) stored,
  add column longitude numeric(9,6) generated always as
    (round(extensions.st_x(location::extensions.geometry)::numeric, 6)) stored;

create index worker_profiles_service_origin_gix on public.worker_profiles using gist(service_origin);
create index addresses_location_gix on public.addresses using gist(location);
create index service_requests_location_gix on public.service_requests using gist(service_location);
create index location_updates_location_gix on public.location_updates using gist(location);

alter table public.ai_analyses
  add column provider_model text,
  add column idempotency_key text,
  add column request_draft text,
  add constraint ai_analyses_idempotency_key_check
    check (idempotency_key is null or length(idempotency_key) between 16 and 128),
  add constraint ai_analyses_cost_range_check
    check (
      estimated_cost_minimum is null
      or estimated_cost_maximum is null
      or estimated_cost_minimum <= estimated_cost_maximum
    );
create unique index ai_analyses_account_idempotency_idx
  on public.ai_analyses(account_id, idempotency_key) where idempotency_key is not null;

create table public.ai_analysis_attempts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  analysis_id uuid references public.ai_analyses(id) on delete set null,
  idempotency_key text not null check (length(idempotency_key) between 16 and 128),
  provider text not null check (provider in ('OPENAI','GEMINI','OPENROUTER')),
  model text not null,
  outcome text not null check (outcome in ('SUCCEEDED','FAILED','SKIPPED')),
  retryable boolean not null,
  latency_ms integer not null check (latency_ms >= 0),
  error_code text,
  created_at timestamptz not null default now()
);
create index ai_analysis_attempts_account_time_idx
  on public.ai_analysis_attempts(account_id, created_at desc);
create unique index ai_analysis_attempts_idempotent_idx
  on public.ai_analysis_attempts(account_id, idempotency_key, provider, model, outcome);
alter table public.ai_analysis_attempts enable row level security;
revoke all on public.ai_analysis_attempts from anon, authenticated;
grant select on public.ai_analysis_attempts to authenticated;
create policy ai_attempts_owner_or_admin_read on public.ai_analysis_attempts
  for select to authenticated
  using (account_id = auth.uid() or public.is_admin(false));

create or replace function public.persist_ai_analysis(
  p_account_id uuid, p_input_type text, p_input_storage_path text, p_transcript text,
  p_idempotency_key text, p_provider text, p_model text, p_provider_reference text,
  p_result jsonb, p_attempts jsonb
) returns public.ai_analyses
language plpgsql security definer set search_path = '' as $$
declare result public.ai_analyses;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode='42501', message='SERVICE_ROLE_REQUIRED';
  end if;
  if p_input_type not in ('TEXT','IMAGE','VOICE')
    or p_provider not in ('OPENAI','GEMINI','OPENROUTER')
    or length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode='22023', message='INVALID_AI_ANALYSIS';
  end if;
  insert into public.ai_analyses(
    account_id,input_type,input_storage_path,transcript,detected_issue,severity,
    possible_cause,suggested_category_name,estimated_cost_minimum,
    estimated_cost_maximum,safety_advice,request_draft,provider,provider_model,
    provider_reference,idempotency_key
  ) values (
    p_account_id,p_input_type,p_input_storage_path,p_transcript,
    p_result->>'detectedIssue',p_result->>'severity',p_result->>'possibleCause',
    p_result->>'suggestedCategory',(p_result->>'estimatedCostMinimum')::numeric,
    (p_result->>'estimatedCostMaximum')::numeric,p_result->>'safetyAdvice',
    p_result->>'requestDraft',p_provider,p_model,p_provider_reference,p_idempotency_key
  )
  on conflict(account_id,idempotency_key) where idempotency_key is not null
    do update set id=public.ai_analyses.id
  returning * into result;

  insert into public.ai_analysis_attempts(
    account_id,analysis_id,idempotency_key,provider,model,outcome,retryable,
    latency_ms,error_code
  )
  select p_account_id,result.id,p_idempotency_key,attempt.provider,attempt.model,
    attempt.outcome,attempt.retryable,attempt.latency_ms,attempt.error_code
  from jsonb_to_recordset(p_attempts) as attempt(
    provider text, model text, outcome text, retryable boolean,
    latency_ms integer, error_code text
  )
  on conflict(account_id,idempotency_key,provider,model,outcome) do nothing;
  return result;
end $$;

revoke execute on function public.persist_ai_analysis(uuid,text,text,text,text,text,text,text,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.persist_ai_analysis(uuid,text,text,text,text,text,text,text,jsonb,jsonb)
  to service_role;

create or replace function private.make_location(p_latitude numeric, p_longitude numeric)
returns extensions.geography
language plpgsql immutable set search_path = '' as $$
begin
  if p_latitude is null or p_longitude is null
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180 then
    raise exception using errcode='22023', message='INVALID_COORDINATES';
  end if;
  return extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography;
end $$;

create or replace function public.set_address_location(
  p_address_id uuid,
  p_latitude numeric,
  p_longitude numeric
) returns public.addresses
language plpgsql security definer set search_path = '' as $$
declare result public.addresses;
begin
  update public.addresses
  set location = private.make_location(p_latitude, p_longitude)
  where id = p_address_id and account_id = auth.uid()
  returning * into result;
  if result.id is null then
    raise exception using errcode='42501', message='ADDRESS_UNAVAILABLE';
  end if;
  return result;
end $$;

create or replace function public.set_worker_service_area(
  p_latitude numeric,
  p_longitude numeric,
  p_radius_meters integer
) returns public.worker_profiles
language plpgsql security definer set search_path = '' as $$
declare result public.worker_profiles;
begin
  if public.current_role() <> 'WORKER' then
    raise exception using errcode='42501', message='WORKER_ROLE_REQUIRED';
  end if;
  if p_radius_meters not between 100 and 200000 then
    raise exception using errcode='22023', message='INVALID_SERVICE_RADIUS';
  end if;
  update public.worker_profiles
  set service_origin = private.make_location(p_latitude, p_longitude),
      service_radius_meters = p_radius_meters
  where account_id = auth.uid()
  returning * into result;
  return result;
end $$;

create or replace function public.create_service_request(
  category_id uuid, address_id uuid, description text, scheduled_at timestamptz,
  budget numeric, notes text default null, ai_analysis_id uuid default null,
  notify_on_match boolean default false
) returns public.service_requests
language plpgsql security definer set search_path = '' as $$
declare result public.service_requests; address_location extensions.geography;
begin
  if public.current_role() <> 'USER' then raise exception using errcode='42501', message='USER role required'; end if;
  if not exists(select 1 from public.content_pages where key='TERMS' and published_at is not null) then
    raise exception using errcode='P0001', message='CONTENT_NOT_CONFIGURED';
  end if;
  select location into address_location from public.addresses
    where id = address_id and account_id = auth.uid();
  if address_location is null then raise exception using errcode='22023', message='ADDRESS_LOCATION_REQUIRED'; end if;
  if ai_analysis_id is not null and not exists(
    select 1 from public.ai_analyses where id=ai_analysis_id and account_id=auth.uid()
  ) then raise exception using errcode='42501', message='AI_ANALYSIS_UNAVAILABLE'; end if;
  if scheduled_at <= now() or budget <= 0 or length(trim(description)) not between 10 and 4000 then
    raise exception using errcode='22023', message='Invalid service request';
  end if;
  insert into public.service_requests(
    user_account_id, category_id, address_id, service_location, description,
    scheduled_at, budget, notes, ai_analysis_id, notify_on_match, status
  ) values(
    auth.uid(), category_id, address_id, address_location, trim(description),
    scheduled_at, round(budget,2), nullif(trim(notes),''), ai_analysis_id, notify_on_match, 'OPEN'
  ) returning * into result;
  return result;
end $$;

create or replace function public.generate_matches(p_service_request_id uuid)
returns setof public.match_candidates
language plpgsql security definer set search_path = '' as $$
declare request public.service_requests; matched_count integer;
begin
  select * into request from public.service_requests where id=p_service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') then
    raise exception using errcode='42501',message='Service request unavailable';
  end if;
  delete from public.match_candidates where service_request_id=request.id;
  insert into public.match_candidates(service_request_id,worker_id,score,rank,factors,eligible)
  with eligible as (
    select wp.account_id worker_id, ws.years,
      coalesce(avg(r.stars) filter(where r.moderation_status='PUBLISHED'),0)::numeric(3,2) rating,
      wp.recommendation_priority,
      extensions.st_distance(wp.service_origin, request.service_location)::numeric(12,2) distance_meters,
      (ws.years*5 + coalesce(avg(r.stars) filter(where r.moderation_status='PUBLISHED'),0)*10)::numeric(7,4) suitability_score
    from public.worker_profiles wp
    join public.worker_skills ws on ws.worker_id=wp.account_id
    left join public.reviews r on r.worker_account_id=wp.account_id
    where ws.category_id=request.category_id
      and wp.approval_status='APPROVED' and wp.is_available
      and wp.service_origin is not null and wp.service_radius_meters is not null
      and extensions.st_dwithin(wp.service_origin, request.service_location, wp.service_radius_meters)
      and exists(
        select 1 from public.worker_availability wa
        where wa.worker_id=wp.account_id
          and wa.day_of_week=extract(dow from request.scheduled_at)::integer
          and request.scheduled_at::time between wa.start_time and wa.end_time
      )
    group by wp.account_id,ws.years,wp.recommendation_priority,wp.service_origin,wp.service_radius_meters
  ), ranked as (
    select *, row_number() over(
      order by suitability_score desc, distance_meters asc, recommendation_priority desc, worker_id
    )::integer as candidate_rank
    from eligible
  )
  select request.id, worker_id, suitability_score, candidate_rank,
    jsonb_build_object(
      'category',true,'available',true,'years',years,'rating',rating,
      'distance_meters',distance_meters,'recommendation_priority',recommendation_priority
    ), true
  from ranked where candidate_rank <= 5;
  get diagnostics matched_count=row_count;
  if matched_count>0 then update public.service_requests set status='MATCHED' where id=request.id;
  else perform pgmq.send('no_match_notifications',jsonb_build_object('service_request_id',request.id,'user_account_id',request.user_account_id),300); end if;
  return query select * from public.match_candidates
    where service_request_id=request.id order by rank;
end $$;

create or replace function public.select_worker(p_service_request_id uuid, p_worker_id uuid)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare request public.service_requests; result public.bookings; conversation_id uuid;
begin
  select * into request from public.service_requests where id = p_service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') then
    raise exception using errcode='42501', message='Service request cannot be selected';
  end if;
  if not exists(
    select 1 from public.worker_profiles wp
    join public.worker_skills ws on ws.worker_id=wp.account_id
    where wp.account_id=p_worker_id and wp.approval_status='APPROVED' and wp.is_available
      and ws.category_id=request.category_id
      and wp.service_origin is not null and wp.service_radius_meters is not null
      and extensions.st_dwithin(wp.service_origin, request.service_location, wp.service_radius_meters)
  ) then raise exception using errcode='P0001', message='WORKER_UNAVAILABLE'; end if;
  insert into public.bookings(service_request_id,user_account_id,worker_account_id)
    values(request.id,auth.uid(),p_worker_id) returning * into result;
  insert into public.booking_status_events(booking_id,to_status,actor_id)
    values(result.id,'PENDING',auth.uid());
  insert into public.conversations(booking_id) values(result.id) returning id into conversation_id;
  insert into public.conversation_participants(conversation_id,account_id)
    values(conversation_id,auth.uid()),(conversation_id,p_worker_id);
  update public.service_requests set status='BOOKED', selected_worker_id=p_worker_id where id=request.id;
  perform pgmq.send('booking_timeouts', jsonb_build_object('booking_id',result.id,'due_at',result.response_due_at,'attempt',0));
  return result;
end $$;

create or replace function public.record_worker_location(
  booking_id uuid,
  latitude numeric,
  longitude numeric
) returns public.location_updates
language plpgsql security definer set search_path = '' as $$
declare booking public.bookings; result public.location_updates;
begin
  select * into booking from public.bookings where id=booking_id;
  if booking.worker_account_id is distinct from auth.uid()
    or booking.status not in ('WORKER_EN_ROUTE','WORKER_ARRIVED','SERVICE_STARTED','IN_PROGRESS') then
    raise exception using errcode='42501', message='Location update not allowed';
  end if;
  insert into public.location_updates(booking_id,account_id,location)
    values(booking.id,auth.uid(),private.make_location(latitude,longitude)) returning * into result;
  return result;
end $$;

create or replace function public.get_booking_tracking(p_booking_id uuid, p_limit integer default 100)
returns table(latitude numeric, longitude numeric, recorded_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_booking_party(p_booking_id) then
    raise exception using errcode='42501', message='BOOKING_LOCATION_UNAVAILABLE';
  end if;
  return query
    select updates.latitude, updates.longitude, updates.recorded_at
    from public.location_updates updates
    where updates.booking_id=p_booking_id
    order by updates.recorded_at desc
    limit least(greatest(p_limit,1),250);
end $$;

revoke execute on function private.make_location(numeric,numeric) from public, anon, authenticated;
revoke execute on function public.set_address_location(uuid,numeric,numeric),
  public.set_worker_service_area(numeric,numeric,integer),
  public.get_booking_tracking(uuid,integer) from public, anon;
grant execute on function public.set_address_location(uuid,numeric,numeric),
  public.set_worker_service_area(numeric,numeric,integer),
  public.get_booking_tracking(uuid,integer) to authenticated;

-- ============================================================================
-- 6. Secure administrator bootstrap
-- Source: supabase/migrations/20260720000600_secure_admin_bootstrap.sql
-- ============================================================================

-- Secure, one-time administrator bootstrap. FR-19, NFR-04, NFR-06.

create table if not exists private.admin_bootstrap_requests (
  email text primary key check (email = lower(btrim(email)) and length(email) between 3 and 254),
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  display_name text not null check (length(display_name) between 2 and 120),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at and expires_at <= created_at + interval '10 minutes')
);
revoke all on private.admin_bootstrap_requests from public, anon, authenticated, service_role;

create or replace function public.prepare_admin_bootstrap(
  email text,
  token_hash text,
  display_name text,
  expires_at timestamptz
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(btrim(email));
  normalized_name text := btrim(display_name);
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(normalized_email) > 254 then
    raise exception using errcode = '22023', message = 'INVALID_ADMIN_EMAIL';
  end if;
  if token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'INVALID_BOOTSTRAP_TOKEN_HASH';
  end if;
  if length(normalized_name) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'INVALID_ADMIN_DISPLAY_NAME';
  end if;
  if expires_at <= now() or expires_at > now() + interval '10 minutes' then
    raise exception using errcode = '22023', message = 'INVALID_BOOTSTRAP_EXPIRATION';
  end if;
  if exists(select 1 from auth.users where lower(auth.users.email) = normalized_email)
     or exists(select 1 from public.accounts where lower(accounts.email) = normalized_email) then
    raise exception using errcode = '23505', message = 'ADMIN_ACCOUNT_ALREADY_EXISTS';
  end if;

  insert into private.admin_bootstrap_requests(email, token_hash, display_name, expires_at)
  values(normalized_email, token_hash, normalized_name, expires_at)
  on conflict on constraint admin_bootstrap_requests_pkey do update
    set token_hash = excluded.token_hash,
        display_name = excluded.display_name,
        expires_at = excluded.expires_at,
        created_at = now();
end
$$;

create or replace function public.cancel_admin_bootstrap(email text, token_hash text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  delete from private.admin_bootstrap_requests request
  where request.email = lower(btrim($1))
    and request.token_hash = $2;
end
$$;

create or replace function public.admin_bootstrap_status(email text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when auth.role() = 'service_role' then jsonb_build_object(
    'auth_user_id', auth_user.id,
    'auth_user_exists', auth_user.id is not null,
    'account_exists', account.id is not null,
    'admin_profile_exists', admin_profile.account_id is not null,
    'app_role', auth_user.raw_app_meta_data->>'ayos_role',
    'account_is_admin', coalesce(account.role = 'ADMIN', false),
    'account_is_active', coalesce(account.status = 'ACTIVE' and account.deleted_at is null, false),
    'account_is_protected', coalesce(account.is_protected, false),
    'bootstrap_token_present', coalesce(auth_user.raw_user_meta_data->>'admin_bootstrap_token', '') <> '',
    'fully_bootstrapped', coalesce(
      account.role = 'ADMIN'
      and account.status = 'ACTIVE'
      and account.is_protected
      and account.deleted_at is null
      and admin_profile.account_id is not null
      and auth_user.raw_app_meta_data->>'ayos_role' = 'ADMIN',
      false
    ) and not (
      coalesce(auth_user.raw_user_meta_data->>'admin_bootstrap_token', '') <> ''
    )
  ) else null end
  from (select lower(btrim(email)) as normalized_email) input
  left join auth.users auth_user on lower(auth_user.email) = input.normalized_email
  left join public.accounts account on account.id = auth_user.id
  left join public.admin_profiles admin_profile on admin_profile.account_id = auth_user.id
$$;

create or replace function public.provision_account()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  requested_role public.account_role;
  display_name text;
  mobile_value text;
  bootstrap_token text;
  bootstrap_request private.admin_bootstrap_requests;
begin
  bootstrap_token := nullif(new.raw_user_meta_data->>'admin_bootstrap_token', '');
  if bootstrap_token is not null then
    delete from private.admin_bootstrap_requests request
    where request.email = lower(new.email)
      and request.token_hash = encode(extensions.digest(bootstrap_token, 'sha256'), 'hex')
      and request.expires_at > now()
    returning * into bootstrap_request;
  end if;

  if bootstrap_request.email is not null then
    requested_role := 'ADMIN';
    display_name := bootstrap_request.display_name;
  else
    begin
      requested_role := upper(coalesce(new.raw_user_meta_data->>'role', ''))::public.account_role;
    exception when invalid_text_representation then
      raise exception using errcode = '42501', message = 'Invalid account role';
    end;
    if requested_role = 'ADMIN' then
      raise exception using errcode = '42501', message = 'Administrator self-registration is prohibited';
    end if;
    if requested_role not in ('USER', 'WORKER') then
      raise exception using errcode = '42501', message = 'Invalid account role';
    end if;
    if not exists(
      select 1 from public.content_pages where key = 'TERMS' and published_at is not null
    ) then
      raise exception using errcode = 'P0001', message = 'Registration is unavailable until Terms are published';
    end if;
    display_name := btrim(coalesce(new.raw_user_meta_data->>'name', ''));
  end if;

  mobile_value := nullif(btrim(coalesce(new.raw_user_meta_data->>'mobile', '')), '');
  if length(display_name) < 2 then
    raise exception using errcode = '22023', message = 'A valid display name is required';
  end if;

  insert into public.accounts(id, role, status, email, mobile, is_protected)
  values(
    new.id,
    requested_role,
    case when requested_role = 'ADMIN' or new.email_confirmed_at is not null
      then 'ACTIVE'::public.account_status
      else 'PENDING_VERIFICATION'::public.account_status
    end,
    lower(new.email),
    mobile_value,
    requested_role = 'ADMIN'
  );
  if requested_role = 'USER' then
    insert into public.user_profiles(account_id, display_name) values(new.id, display_name);
  elsif requested_role = 'WORKER' then
    insert into public.worker_profiles(account_id, display_name) values(new.id, display_name);
  else
    insert into public.admin_profiles(account_id, display_name) values(new.id, display_name);
  end if;
  return new;
end
$$;

revoke execute on function public.prepare_admin_bootstrap(text,text,text,timestamptz),
  public.cancel_admin_bootstrap(text,text),
  public.admin_bootstrap_status(text) from public, anon, authenticated;
grant execute on function public.prepare_admin_bootstrap(text,text,text,timestamptz),
  public.cancel_admin_bootstrap(text,text),
  public.admin_bootstrap_status(text) to service_role;

-- ============================================================================
-- 7. UI integration commands
-- Source: supabase/migrations/20260720000700_ui_integration_commands.sql
-- ============================================================================

-- Minimal commands and policies required to connect the verified Admin, User,
-- and Worker interfaces. Existing business tables and lifecycle rules remain
-- authoritative.

create or replace function public.admin_create_notification(
  p_audience public.notification_audience,
  p_title text,
  p_body text,
  p_category text,
  p_scheduled_at timestamptz default null
) returns public.notifications
language plpgsql security definer set search_path = '' as $$
declare
  result public.notifications;
  schedule_delay integer;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2 administrator required';
  end if;
  if length(trim(p_title)) not between 1 and 160
    or length(trim(p_body)) not between 1 and 4000
    or length(trim(p_category)) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'Invalid notification';
  end if;
  if p_scheduled_at is not null and p_scheduled_at <= now() then
    raise exception using errcode = '22023', message = 'Scheduled time must be in the future';
  end if;

  insert into public.notifications(
    audience, title, body, category, status, scheduled_at, sent_at
  ) values (
    p_audience,
    trim(p_title),
    trim(p_body),
    upper(trim(p_category)),
    case when p_scheduled_at is null
      then 'SENT'::public.notification_status
      else 'SCHEDULED'::public.notification_status
    end,
    p_scheduled_at,
    case when p_scheduled_at is null then now() else null end
  ) returning * into result;

  if p_scheduled_at is not null then
    schedule_delay := greatest(0, extract(epoch from (p_scheduled_at - now()))::integer);
    perform pgmq.send(
      'scheduled_notifications',
      jsonb_build_object('notification_id', result.id),
      schedule_delay
    );
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'NOTIFICATION_CREATED',
    'notification',
    result.id::text,
    jsonb_build_object('audience', p_audience, 'status', result.status)
  );
  return result;
end $$;

create or replace function public.admin_upsert_service_category(
  p_category_id uuid,
  p_name text,
  p_description text,
  p_is_active boolean
) returns public.service_categories
language plpgsql security definer set search_path = '' as $$
declare
  result public.service_categories;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2 administrator required';
  end if;
  if length(trim(p_name)) not between 2 and 120
    or (p_description is not null and length(trim(p_description)) > 1000) then
    raise exception using errcode = '22023', message = 'Invalid service category';
  end if;

  if p_category_id is null then
    insert into public.service_categories(name, description, is_active)
    values (trim(p_name), nullif(trim(p_description), ''), p_is_active)
    returning * into result;
  else
    update public.service_categories
    set name = trim(p_name),
        description = nullif(trim(p_description), ''),
        is_active = p_is_active,
        updated_at = now()
    where id = p_category_id
    returning * into result;
    if result.id is null then
      raise exception using errcode = 'P0002', message = 'Service category not found';
    end if;
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'SERVICE_CATEGORY_UPSERTED',
    'service_category',
    result.id::text,
    jsonb_build_object('active', result.is_active)
  );
  return result;
end $$;

create or replace function public.attach_request_media(
  p_service_request_id uuid,
  p_storage_path text,
  p_content_type text,
  p_byte_size integer
) returns public.request_media
language plpgsql security definer set search_path = '' as $$
declare result public.request_media;
begin
  if not exists (
    select 1 from public.service_requests r
    where r.id = p_service_request_id and r.user_account_id = auth.uid()
  ) then
    raise exception using errcode = '42501', message = 'Service request unavailable';
  end if;
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text
    or p_content_type not in ('image/jpeg', 'image/png', 'image/webp')
    or p_byte_size not between 1 and 15728640 then
    raise exception using errcode = '22023', message = 'Invalid request media';
  end if;
  insert into public.request_media(service_request_id, storage_path, content_type, byte_size)
  values (p_service_request_id, p_storage_path, p_content_type, p_byte_size)
  returning * into result;
  return result;
end $$;

create or replace function public.attach_review_media(
  p_review_id uuid,
  p_storage_path text,
  p_content_type text,
  p_byte_size integer
) returns public.review_media
language plpgsql security definer set search_path = '' as $$
declare result public.review_media;
begin
  if not exists (
    select 1 from public.reviews r
    where r.id = p_review_id and r.user_account_id = auth.uid()
  ) then
    raise exception using errcode = '42501', message = 'Review unavailable';
  end if;
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text
    or p_content_type not in ('image/jpeg', 'image/png', 'image/webp')
    or p_byte_size not between 1 and 15728640 then
    raise exception using errcode = '22023', message = 'Invalid review media';
  end if;
  insert into public.review_media(review_id, storage_path, content_type, byte_size)
  values (p_review_id, p_storage_path, p_content_type, p_byte_size)
  returning * into result;
  return result;
end $$;

create or replace function public.save_ai_analysis(p_analysis_id uuid)
returns public.ai_analyses
language plpgsql security definer set search_path = '' as $$
declare result public.ai_analyses;
begin
  update public.ai_analyses
  set saved = true
  where id = p_analysis_id and account_id = auth.uid()
  returning * into result;
  if result.id is null then
    raise exception using errcode = '42501', message = 'AI analysis unavailable';
  end if;
  return result;
end $$;

create policy matching_worker_request_read
on public.service_requests for select to authenticated
using (
  exists (
    select 1 from public.match_candidates candidate
    where candidate.service_request_id = service_requests.id
      and candidate.worker_id = auth.uid()
      and candidate.eligible
  )
);

create policy matching_worker_request_media_read
on public.request_media for select to authenticated
using (
  exists (
    select 1 from public.match_candidates candidate
    where candidate.service_request_id = request_media.service_request_id
      and candidate.worker_id = auth.uid()
      and candidate.eligible
  )
);

create policy storage_matching_worker_request_media_read
on storage.objects for select to authenticated
using (
  bucket_id = 'request-media'
  and exists (
    select 1
    from public.request_media media
    join public.match_candidates candidate
      on candidate.service_request_id = media.service_request_id
    where media.storage_path = storage.objects.name
      and candidate.worker_id = auth.uid()
      and candidate.eligible
  )
);

revoke execute on function public.admin_create_notification(
  public.notification_audience, text, text, text, timestamptz
), public.admin_upsert_service_category(uuid, text, text, boolean),
public.attach_request_media(uuid, text, text, integer),
public.attach_review_media(uuid, text, text, integer),
public.save_ai_analysis(uuid)
from public, anon;

grant execute on function public.admin_create_notification(
  public.notification_audience, text, text, text, timestamptz
), public.admin_upsert_service_category(uuid, text, text, boolean),
public.attach_request_media(uuid, text, text, integer),
public.attach_review_media(uuid, text, text, integer),
public.save_ai_analysis(uuid)
to authenticated;

-- ============================================================================
-- 8. Historical payment records and worker wallet
-- Source: supabase/migrations/20260721000100_paymongo_wallet.sql
-- ============================================================================

-- PayMongo GCash payments and worker financial ledger.

alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments
  add column currency text not null default 'PHP' check (currency = 'PHP'),
  add column provider text check (provider is null or provider in ('PAYMONGO')),
  add column provider_payment_id text,
  add column paid_at timestamptz;
create unique index payments_provider_payment_idx on public.payments(provider, provider_payment_id)
  where provider_payment_id is not null;

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  provider text not null check (provider = 'PAYMONGO'),
  method public.payment_method not null check (method = 'GCASH'),
  status text not null default 'PENDING' check (status in ('PENDING','REQUIRES_ACTION','PROCESSING','SUCCESSFUL','FAILED','EXPIRED','CANCELLED')),
  amount_centavos bigint not null check (amount_centavos between 100 and 10000000),
  currency text not null default 'PHP' check (currency = 'PHP'),
  idempotency_key text not null unique check (length(idempotency_key) between 16 and 128),
  provider_intent_id text unique,
  provider_payment_method_id text,
  provider_payment_id text unique,
  redirect_url text,
  return_url text,
  failure_code text,
  failure_reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index payment_attempts_payment_time_idx on public.payment_attempts(payment_id, created_at desc);

create table public.payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'PAYMONGO'),
  provider_event_id text not null,
  event_type text not null,
  livemode boolean not null,
  payload_hash text not null,
  status text not null default 'RECEIVED' check (status in ('RECEIVED','PROCESSED','IGNORED','FAILED')),
  failure_reason text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider, provider_event_id)
);

create table public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.worker_profiles(account_id) on delete restrict,
  currency text not null default 'PHP' check (currency = 'PHP'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','FROZEN','CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  kind text not null check (kind in ('EARNING','TOP_UP','PAYOUT','REFUND','FEE','ADJUSTMENT')),
  status text not null check (status in ('PENDING','AVAILABLE','HELD','COMPLETED','FAILED','REVERSED')),
  amount numeric(12,2) not null check (amount <> 0),
  source_type text not null,
  source_id uuid not null,
  description text not null check (length(description) between 1 and 240),
  available_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(wallet_account_id, source_type, source_id, kind)
);
create index wallet_transactions_wallet_time_idx on public.wallet_transactions(wallet_account_id, created_at desc);

create table public.payout_destinations (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(account_id) on delete restrict,
  kind text not null check (kind in ('GCASH','BANK')),
  label text not null check (length(label) between 1 and 80),
  account_name text not null check (length(account_name) between 2 and 120),
  account_reference text not null check (length(account_reference) between 4 and 120),
  is_default boolean not null default false,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','DISABLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index one_default_payout_destination on public.payout_destinations(worker_id) where is_default and status = 'ACTIVE';

create table public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  destination_id uuid not null references public.payout_destinations(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  fee_amount numeric(12,2) not null default 0 check (fee_amount >= 0),
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED')),
  idempotency_key text not null unique check (length(idempotency_key) between 16 and 128),
  provider text,
  provider_reference text,
  failure_reason text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index payout_requests_wallet_time_idx on public.payout_requests(wallet_account_id, created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array['payment_attempts','payment_provider_events','wallet_accounts','wallet_transactions','payout_destinations','payout_requests']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
  end loop;
end $$;

grant select on public.payment_attempts, public.wallet_accounts, public.wallet_transactions,
  public.payout_destinations, public.payout_requests to authenticated;

create policy payment_attempts_party_or_admin_read on public.payment_attempts for select to authenticated
using (exists (
  select 1 from public.payments p
  where p.id = payment_id and exists (
    select 1 from public.bookings b where b.id = p.booking_id and public.is_booking_party(b.id)
  )
));
create policy wallet_accounts_owner_or_admin_read on public.wallet_accounts for select to authenticated
using (account_id = auth.uid() or public.is_admin(true));
create policy wallet_transactions_owner_or_admin_read on public.wallet_transactions for select to authenticated
using (exists (
  select 1 from public.wallet_accounts w
  where w.id = wallet_account_id and (w.account_id = auth.uid() or public.is_admin(true))
));
create policy payout_destinations_owner_or_admin_read on public.payout_destinations for select to authenticated
using (worker_id = auth.uid() or public.is_admin(true));
create policy payout_requests_owner_or_admin_read on public.payout_requests for select to authenticated
using (exists (
  select 1 from public.wallet_accounts w
  where w.id = wallet_account_id and (w.account_id = auth.uid() or public.is_admin(true))
));

create trigger set_payment_attempts_updated_at before update on public.payment_attempts
for each row execute function public.set_updated_at();
create trigger set_wallet_accounts_updated_at before update on public.wallet_accounts
for each row execute function public.set_updated_at();
create trigger set_wallet_transactions_updated_at before update on public.wallet_transactions
for each row execute function public.set_updated_at();
create trigger set_payout_destinations_updated_at before update on public.payout_destinations
for each row execute function public.set_updated_at();
create trigger set_payout_requests_updated_at before update on public.payout_requests
for each row execute function public.set_updated_at();

create or replace function public.begin_gcash_payment(p_booking_id uuid, p_idempotency_key text)
returns public.payment_attempts
language plpgsql security definer set search_path = '' as $$
declare
  booking public.bookings;
  payment public.payments;
  attempt public.payment_attempts;
  service_amount numeric(12,2);
  commission_rate numeric(5,4) := 0.1000;
  commission_amount numeric(12,2);
begin
  if length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'Invalid idempotency key';
  end if;
  select * into booking from public.bookings where id = p_booking_id for update;
  if booking.id is null or booking.user_account_id is distinct from auth.uid() or booking.status <> 'COMPLETED' then
    raise exception using errcode = '42501', message = 'GCash payment is not allowed';
  end if;
  if not exists (select 1 from public.accounts a where a.id = auth.uid() and a.status = 'ACTIVE' and a.role = 'USER') then
    raise exception using errcode = '42501', message = 'Active user account required';
  end if;
  select * into payment from public.payments where booking_id = booking.id for update;
  if payment.status = 'SUCCESSFUL' then
    raise exception using errcode = '23505', message = 'Booking is already paid';
  end if;
  if payment.id is not null and payment.method = 'CASH' and exists (
    select 1 from public.cash_confirmations c where c.payment_id = payment.id
  ) then
    raise exception using errcode = '55000', message = 'Cash confirmation is already in progress';
  end if;
  service_amount := (select r.budget from public.service_requests r where r.id = booking.service_request_id);
  commission_amount := round(service_amount * commission_rate, 2);
  if payment.id is null then
    insert into public.payments(
      booking_id, method, status, service_amount, commission_rate, commission_amount,
      worker_net_amount, homeowner_platform_charge, idempotency_key, currency, provider
    ) values (
      booking.id, 'GCASH', 'PENDING', service_amount, commission_rate, commission_amount,
      service_amount - commission_amount, 0, p_idempotency_key, 'PHP', 'PAYMONGO'
    ) returning * into payment;
  else
    update public.payments set method = 'GCASH', status = 'PENDING', provider = 'PAYMONGO',
      failure_reason = null, updated_at = now()
    where id = payment.id returning * into payment;
  end if;
  select * into attempt from public.payment_attempts where idempotency_key = p_idempotency_key;
  if attempt.id is not null then
    if attempt.payment_id <> payment.id then
      raise exception using errcode = '23505', message = 'Idempotency key is already used';
    end if;
    return attempt;
  end if;
  insert into public.payment_attempts(
    payment_id, provider, method, status, amount_centavos, idempotency_key
  ) values (
    payment.id, 'PAYMONGO', 'GCASH', 'PENDING', round((service_amount + payment.homeowner_platform_charge) * 100), p_idempotency_key
  ) returning * into attempt;
  return attempt;
end $$;

create or replace function public.get_booking_payment(p_booking_id uuid)
returns table (
  payment_id uuid,
  method public.payment_method,
  status public.payment_status,
  service_amount numeric,
  commission_amount numeric,
  worker_net_amount numeric,
  homeowner_platform_charge numeric,
  provider text,
  provider_payment_id text,
  latest_attempt_status text,
  receipt_number text,
  paid_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.method, p.status, p.service_amount, p.commission_amount,
    p.worker_net_amount, p.homeowner_platform_charge, p.provider, p.provider_payment_id,
    a.status, r.receipt_number, coalesce(p.paid_at, p.successful_at)
  from public.payments p
  join public.bookings b on b.id = p.booking_id
  left join lateral (
    select pa.status from public.payment_attempts pa where pa.payment_id = p.id order by pa.created_at desc limit 1
  ) a on true
  left join public.receipts r on r.payment_id = p.id
  where p.booking_id = p_booking_id and public.is_booking_party(b.id)
$$;

create or replace function public.apply_paymongo_payment_event(
  p_provider_event_id text,
  p_event_type text,
  p_livemode boolean,
  p_payload_hash text,
  p_provider_intent_id text,
  p_provider_payment_id text,
  p_amount_centavos bigint,
  p_failure_reason text default null
)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  attempt public.payment_attempts;
  payment public.payments;
  booking public.bookings;
  event_id uuid;
begin
  insert into public.payment_provider_events(provider, provider_event_id, event_type, livemode, payload_hash)
  values ('PAYMONGO', p_provider_event_id, p_event_type, p_livemode, p_payload_hash)
  on conflict(provider, provider_event_id) do nothing
  returning id into event_id;
  if event_id is null then return 'DUPLICATE'; end if;
  select * into attempt from public.payment_attempts
  where provider_intent_id = p_provider_intent_id for update;
  if attempt.id is null then
    update public.payment_provider_events set status = 'IGNORED', processed_at = now(), failure_reason = 'Unknown payment intent'
    where id = event_id;
    return 'IGNORED';
  end if;
  select * into payment from public.payments where id = attempt.payment_id for update;
  if p_amount_centavos <> attempt.amount_centavos then
    update public.payment_provider_events set status = 'FAILED', processed_at = now(), failure_reason = 'Amount mismatch'
    where id = event_id;
    return 'AMOUNT_MISMATCH';
  end if;
  if p_event_type in ('payment.paid','payment_intent.succeeded') then
    update public.payment_attempts set status = 'SUCCESSFUL', provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      completed_at = coalesce(completed_at, now()), failure_code = null, failure_reason = null
    where id = attempt.id;
    update public.payments set status = 'SUCCESSFUL', provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      successful_at = coalesce(successful_at, now()), paid_at = coalesce(paid_at, now()), failure_reason = null
    where id = payment.id returning * into payment;
    insert into public.receipts(
      payment_id, receipt_number, service_amount, commission_rate, commission_amount, worker_net_amount, homeowner_platform_charge
    ) values (
      payment.id, 'AYOS-' || upper(substr(replace(payment.id::text, '-', ''), 1, 12)), payment.service_amount,
      payment.commission_rate, payment.commission_amount, payment.worker_net_amount, payment.homeowner_platform_charge
    ) on conflict(payment_id) do nothing;
    select * into booking from public.bookings where id = payment.booking_id;
    insert into public.notifications(recipient_id, title, body, category, status, sent_at, source_key)
    values (
      booking.user_account_id, 'GCash payment successful', 'Your GCash payment was verified and your receipt is ready.',
      'PAYMENT', 'SENT', now(), 'payment:' || payment.id::text || ':paid'
    ) on conflict(source_key) do nothing;
  elsif p_event_type in ('payment.failed','payment_intent.awaiting_payment_method') then
    update public.payment_attempts set status = 'FAILED', provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      failure_reason = coalesce(nullif(p_failure_reason, ''), 'GCash payment failed'), completed_at = now()
    where id = attempt.id;
    update public.payments set status = 'FAILED', failure_reason = coalesce(nullif(p_failure_reason, ''), 'GCash payment failed')
    where id = payment.id;
  else
    update public.payment_provider_events set status = 'IGNORED', processed_at = now() where id = event_id;
    return 'IGNORED';
  end if;
  update public.payment_provider_events set status = 'PROCESSED', processed_at = now() where id = event_id;
  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values ('PAYMONGO_EVENT_PROCESSED', 'payment', payment.id::text,
    jsonb_build_object('event_type', p_event_type, 'provider_event_id', p_provider_event_id));
  return 'PROCESSED';
end $$;

create or replace function public.credit_worker_wallet_after_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  worker_id uuid;
  wallet_id uuid;
begin
  if new.status <> 'SUCCESSFUL' or (old.status = 'SUCCESSFUL') then return new; end if;
  select b.worker_account_id into worker_id from public.bookings b where b.id = new.booking_id;
  insert into public.wallet_accounts(account_id) values (worker_id)
  on conflict(account_id) do update set updated_at = now()
  returning id into wallet_id;
  insert into public.wallet_transactions(
    wallet_account_id, kind, status, amount, source_type, source_id, description, available_at
  ) values (
    wallet_id, 'EARNING', 'AVAILABLE', new.worker_net_amount, 'PAYMENT', new.id,
    'Net earnings from completed service', now()
  ) on conflict(wallet_account_id, source_type, source_id, kind) do nothing;
  return new;
end $$;
create trigger credit_worker_wallet_after_payment
after update of status on public.payments for each row execute function public.credit_worker_wallet_after_payment();

create or replace function public.get_my_wallet_summary()
returns table (wallet_account_id uuid, available_balance numeric, pending_payout numeric, lifetime_earnings numeric)
language sql stable security definer set search_path = '' as $$
  select w.id,
    coalesce(sum(t.amount) filter (where t.status in ('AVAILABLE','HELD','COMPLETED')), 0),
    abs(coalesce(sum(t.amount) filter (where t.kind = 'PAYOUT' and t.status in ('HELD','PENDING')), 0)),
    coalesce(sum(t.amount) filter (where t.kind = 'EARNING' and t.status in ('AVAILABLE','COMPLETED')), 0)
  from public.wallet_accounts w
  left join public.wallet_transactions t on t.wallet_account_id = w.id
  where w.account_id = auth.uid()
  group by w.id
$$;

create or replace function public.upsert_payout_destination(
  p_id uuid,
  p_kind text,
  p_label text,
  p_account_name text,
  p_account_reference text,
  p_is_default boolean default false
)
returns public.payout_destinations
language plpgsql security definer set search_path = '' as $$
declare result public.payout_destinations;
begin
  if public.current_role() <> 'WORKER' or p_kind not in ('GCASH','BANK') then
    raise exception using errcode = '42501', message = 'Worker payout destination required';
  end if;
  if p_is_default then update public.payout_destinations set is_default = false where worker_id = auth.uid(); end if;
  insert into public.payout_destinations(id, worker_id, kind, label, account_name, account_reference, is_default)
  values (coalesce(p_id, gen_random_uuid()), auth.uid(), p_kind, trim(p_label), trim(p_account_name), trim(p_account_reference), p_is_default)
  on conflict(id) do update set kind = excluded.kind, label = excluded.label, account_name = excluded.account_name,
    account_reference = excluded.account_reference, is_default = excluded.is_default, status = 'ACTIVE'
  where public.payout_destinations.worker_id = auth.uid()
  returning * into result;
  return result;
end $$;

create or replace function public.request_payout(p_destination_id uuid, p_amount numeric, p_idempotency_key text)
returns public.payout_requests
language plpgsql security definer set search_path = '' as $$
declare
  wallet public.wallet_accounts;
  available numeric(12,2);
  payout public.payout_requests;
begin
  if public.current_role() <> 'WORKER' or p_amount < 100 or length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'Invalid payout request';
  end if;
  select * into wallet from public.wallet_accounts where account_id = auth.uid() and status = 'ACTIVE' for update;
  if wallet.id is null then raise exception using errcode = '22023', message = 'Wallet is unavailable'; end if;
  if not exists (select 1 from public.payout_destinations d where d.id = p_destination_id and d.worker_id = auth.uid() and d.status = 'ACTIVE') then
    raise exception using errcode = '42501', message = 'Payout destination is unavailable';
  end if;
  select coalesce(sum(t.amount), 0) into available from public.wallet_transactions t
  where t.wallet_account_id = wallet.id and t.status in ('AVAILABLE','HELD','COMPLETED');
  if available < p_amount then raise exception using errcode = '22023', message = 'Insufficient available balance'; end if;
  insert into public.payout_requests(wallet_account_id, destination_id, amount, idempotency_key)
  values (wallet.id, p_destination_id, p_amount, p_idempotency_key)
  on conflict(idempotency_key) do update set updated_at = now()
  returning * into payout;
  insert into public.wallet_transactions(wallet_account_id, kind, status, amount, source_type, source_id, description)
  values (wallet.id, 'PAYOUT', 'HELD', -p_amount, 'PAYOUT_REQUEST', payout.id, 'Worker payout request')
  on conflict(wallet_account_id, source_type, source_id, kind) do nothing;
  return payout;
end $$;

revoke all on function public.begin_gcash_payment(uuid,text) from public, anon;
revoke all on function public.get_booking_payment(uuid) from public, anon;
revoke all on function public.apply_paymongo_payment_event(text,text,boolean,text,text,text,bigint,text) from public, anon, authenticated;
revoke all on function public.get_my_wallet_summary() from public, anon;
revoke all on function public.upsert_payout_destination(uuid,text,text,text,text,boolean) from public, anon;
revoke all on function public.request_payout(uuid,numeric,text) from public, anon;
grant execute on function public.begin_gcash_payment(uuid,text) to authenticated;
grant execute on function public.get_booking_payment(uuid) to authenticated;
grant execute on function public.apply_paymongo_payment_event(text,text,boolean,text,text,text,bigint,text) to service_role;
grant execute on function public.get_my_wallet_summary() to authenticated;
grant execute on function public.upsert_payout_destination(uuid,text,text,text,text,boolean) to authenticated;
grant execute on function public.request_payout(uuid,numeric,text) to authenticated;

-- ============================================================================
-- 9. Profile and communication parity
-- Source: supabase/migrations/20260721000200_profile_communication_parity.sql
-- ============================================================================

-- Profile, communication, verification, and portfolio capabilities required by the source interfaces.

alter table public.addresses
  add column recipient_name text check (recipient_name is null or length(recipient_name) between 2 and 120),
  add column contact_mobile text check (contact_mobile is null or contact_mobile ~ '^\+[1-9][0-9]{7,14}$'),
  add column instructions text check (instructions is null or length(instructions) <= 1000),
  add column archived_at timestamptz;

alter table public.service_requests add column address_snapshot jsonb;
update public.service_requests r set address_snapshot = jsonb_build_object(
  'label', a.label,
  'line1', a.line1,
  'line2', a.line2,
  'barangay', a.barangay,
  'city', a.city,
  'province', a.province,
  'postal_code', a.postal_code
)
from public.addresses a where a.id = r.address_id and r.address_snapshot is null;

create table public.account_preferences (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  locale text not null default 'en-PH',
  timezone text not null default 'Asia/Manila',
  appearance text not null default 'SYSTEM' check (appearance in ('SYSTEM','LIGHT','DARK')),
  notifications jsonb not null default '{"booking":true,"messages":true,"payments":true,"promotions":true,"system":true}',
  privacy jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.account_preferences(account_id, notifications)
select a.id, coalesce(u.notification_preferences, '{}'::jsonb)
from public.accounts a left join public.user_profiles u on u.account_id = a.id
on conflict(account_id) do nothing;

alter table public.conversation_participants add column last_read_at timestamptz;

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  recipient_id uuid not null references public.accounts(id) on delete cascade,
  status text not null default 'DELIVERED' check (status in ('PENDING','DELIVERED','FAILED')),
  delivered_at timestamptz,
  read_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(notification_id, recipient_id)
);
create index notification_deliveries_recipient_time_idx on public.notification_deliveries(recipient_id, read_at, created_at desc);

alter table public.support_tickets
  add column assigned_admin_id uuid references public.admin_profiles(account_id) on delete set null,
  add column priority text not null default 'NORMAL' check (priority in ('LOW','NORMAL','HIGH','URGENT')),
  add column category text not null default 'GENERAL',
  add column last_message_at timestamptz;

create table public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references public.accounts(id) on delete restrict,
  body text not null check (length(trim(body)) between 1 and 4000),
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index support_ticket_messages_ticket_time_idx on public.support_ticket_messages(ticket_id, created_at);

create table public.worker_verification_documents (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.worker_verifications(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(account_id) on delete cascade,
  document_type text not null check (length(document_type) between 2 and 80),
  storage_path text not null,
  content_type text not null,
  byte_size integer not null check (byte_size between 1 and 15728640),
  revision integer not null default 1 check (revision > 0),
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED','NEEDS_REPLACEMENT','EXPIRED')),
  reviewer_id uuid references public.admin_profiles(account_id) on delete set null,
  review_notes text check (review_notes is null or length(review_notes) <= 2000),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(verification_id, document_type, revision)
);
create index verification_documents_queue_idx on public.worker_verification_documents(status, submitted_at);

create table public.worker_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(account_id) on delete cascade,
  category_id uuid references public.service_categories(id) on delete set null,
  title text not null check (length(title) between 2 and 120),
  description text not null check (length(description) between 3 and 2000),
  completed_on date,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index worker_portfolio_items_worker_order_idx on public.worker_portfolio_items(worker_id, is_published, sort_order);

create table public.worker_portfolio_media (
  id uuid primary key default gen_random_uuid(),
  portfolio_item_id uuid not null references public.worker_portfolio_items(id) on delete cascade,
  storage_path text not null unique,
  content_type text not null,
  byte_size integer not null check (byte_size between 1 and 15728640),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'account_preferences','notification_deliveries','support_ticket_messages',
    'worker_verification_documents','worker_portfolio_items','worker_portfolio_media'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
  end loop;
end $$;

grant select on public.account_preferences, public.notification_deliveries,
  public.support_ticket_messages, public.worker_verification_documents,
  public.worker_portfolio_items, public.worker_portfolio_media to authenticated;

create policy preferences_owner_or_admin_read on public.account_preferences for select to authenticated
using (account_id = auth.uid() or public.is_admin(true));
create policy notification_deliveries_owner_or_admin_read on public.notification_deliveries for select to authenticated
using (recipient_id = auth.uid() or public.is_admin(false));
create policy support_messages_participant_read on public.support_ticket_messages for select to authenticated
using (exists (
  select 1 from public.support_tickets t where t.id = ticket_id and (t.owner_id = auth.uid() or public.is_admin(false))
) and (not is_internal or public.is_admin(false)));
create policy verification_documents_owner_or_admin_read on public.worker_verification_documents for select to authenticated
using (worker_id = auth.uid() or public.is_admin(true));
create policy portfolio_items_visible_read on public.worker_portfolio_items for select to authenticated
using (worker_id = auth.uid() or public.is_admin(false) or (
  is_published and exists (select 1 from public.worker_profiles w where w.account_id = worker_id and w.approval_status = 'APPROVED')
));
create policy portfolio_media_visible_read on public.worker_portfolio_media for select to authenticated
using (exists (
  select 1 from public.worker_portfolio_items i where i.id = portfolio_item_id and (
    i.worker_id = auth.uid() or public.is_admin(false) or (i.is_published and exists (
      select 1 from public.worker_profiles w where w.account_id = i.worker_id and w.approval_status = 'APPROVED'
    ))
  )
));

create trigger set_account_preferences_updated_at before update on public.account_preferences
for each row execute function public.set_updated_at();
create trigger set_notification_deliveries_updated_at before update on public.notification_deliveries
for each row execute function public.set_updated_at();
create trigger set_worker_portfolio_items_updated_at before update on public.worker_portfolio_items
for each row execute function public.set_updated_at();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('portfolio-media','portfolio-media',false,15728640,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy portfolio_storage_owner_upload on storage.objects for insert to authenticated
with check (bucket_id = 'portfolio-media' and (storage.foldername(name))[1] = auth.uid()::text and public.current_role() = 'WORKER');
create policy portfolio_storage_owner_update on storage.objects for update to authenticated
using (bucket_id = 'portfolio-media' and owner_id = auth.uid()::text)
with check (bucket_id = 'portfolio-media' and owner_id = auth.uid()::text);
create policy portfolio_storage_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'portfolio-media' and owner_id = auth.uid()::text);
create policy portfolio_storage_visible_read on storage.objects for select to authenticated
using (bucket_id = 'portfolio-media' and exists (
  select 1 from public.worker_portfolio_media m
  join public.worker_portfolio_items i on i.id = m.portfolio_item_id
  join public.worker_profiles w on w.account_id = i.worker_id
  where m.storage_path = name and (i.worker_id = auth.uid() or public.is_admin(false) or (i.is_published and w.approval_status = 'APPROVED'))
));

create or replace function public.snapshot_request_address()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.address_snapshot is null then
    select jsonb_build_object(
      'label', a.label, 'line1', a.line1, 'line2', a.line2, 'barangay', a.barangay,
      'city', a.city, 'province', a.province, 'postal_code', a.postal_code,
      'recipient_name', a.recipient_name, 'contact_mobile', a.contact_mobile, 'instructions', a.instructions
    ) into new.address_snapshot from public.addresses a where a.id = new.address_id;
  end if;
  return new;
end $$;
create trigger snapshot_request_address before insert on public.service_requests
for each row execute function public.snapshot_request_address();

create or replace function public.update_my_profile(
  p_display_name text,
  p_notifications jsonb default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare role public.account_role; result jsonb;
begin
  role := public.current_role();
  if length(trim(p_display_name)) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'Display name must contain 2 to 120 characters';
  end if;
  if role = 'USER' then
    update public.user_profiles set display_name = trim(p_display_name),
      notification_preferences = coalesce(p_notifications, notification_preferences)
    where account_id = auth.uid() returning to_jsonb(public.user_profiles.*) into result;
  elsif role = 'WORKER' then
    update public.worker_profiles set display_name = trim(p_display_name)
    where account_id = auth.uid() returning to_jsonb(public.worker_profiles.*) into result;
  else
    update public.admin_profiles set display_name = trim(p_display_name)
    where account_id = auth.uid() returning to_jsonb(public.admin_profiles.*) into result;
  end if;
  if p_notifications is not null then
    insert into public.account_preferences(account_id, notifications) values(auth.uid(), p_notifications)
    on conflict(account_id) do update set notifications = excluded.notifications;
  end if;
  return result;
end $$;

create or replace function public.update_my_preferences(
  p_locale text,
  p_timezone text,
  p_appearance text,
  p_notifications jsonb,
  p_privacy jsonb
)
returns public.account_preferences language plpgsql security definer set search_path = '' as $$
declare result public.account_preferences;
begin
  if p_appearance not in ('SYSTEM','LIGHT','DARK') or length(p_locale) not between 2 and 16 or length(p_timezone) not between 3 and 80 then
    raise exception using errcode = '22023', message = 'Invalid preferences';
  end if;
  insert into public.account_preferences(account_id, locale, timezone, appearance, notifications, privacy)
  values(auth.uid(), p_locale, p_timezone, p_appearance, p_notifications, p_privacy)
  on conflict(account_id) do update set locale = excluded.locale, timezone = excluded.timezone,
    appearance = excluded.appearance, notifications = excluded.notifications, privacy = excluded.privacy
  returning * into result;
  return result;
end $$;

create or replace function public.upsert_my_address(
  p_id uuid,
  p_label text,
  p_line1 text,
  p_line2 text,
  p_barangay text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_latitude numeric,
  p_longitude numeric,
  p_is_default boolean,
  p_recipient_name text default null,
  p_contact_mobile text default null,
  p_instructions text default null
)
returns public.addresses language plpgsql security definer set search_path = '' as $$
declare result public.addresses;
begin
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception using errcode = '22023', message = 'Invalid address location';
  end if;
  if p_is_default then update public.addresses set is_default = false where account_id = auth.uid(); end if;
  insert into public.addresses(
    id, account_id, label, line1, line2, barangay, city, province, postal_code,
    location, is_default, recipient_name, contact_mobile, instructions, archived_at
  ) values (
    coalesce(p_id, gen_random_uuid()), auth.uid(), trim(p_label), trim(p_line1), nullif(trim(p_line2), ''),
    trim(p_barangay), trim(p_city), trim(p_province), nullif(trim(p_postal_code), ''),
    extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography,
    p_is_default, nullif(trim(p_recipient_name), ''), nullif(trim(p_contact_mobile), ''), nullif(trim(p_instructions), ''), null
  ) on conflict(id) do update set label = excluded.label, line1 = excluded.line1, line2 = excluded.line2,
    barangay = excluded.barangay, city = excluded.city, province = excluded.province,
    postal_code = excluded.postal_code, location = excluded.location,
    is_default = excluded.is_default, recipient_name = excluded.recipient_name,
    contact_mobile = excluded.contact_mobile, instructions = excluded.instructions, archived_at = null
  where public.addresses.account_id = auth.uid()
  returning * into result;
  return result;
end $$;

create or replace function public.archive_my_address(p_address_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  update public.addresses set archived_at = now(), is_default = false
  where id = p_address_id and account_id = auth.uid() and not exists (
    select 1 from public.service_requests r join public.bookings b on b.service_request_id = r.id
    where r.address_id = p_address_id and b.status not in ('COMPLETED','CANCELLED')
  );
  get diagnostics changed = row_count;
  return changed = 1;
end $$;

create or replace function public.toggle_favorite(p_worker_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if public.current_role() <> 'USER' or not exists (
    select 1 from public.worker_profiles w where w.account_id = p_worker_id and w.approval_status = 'APPROVED'
  ) then raise exception using errcode = '42501', message = 'Worker is unavailable'; end if;
  if exists (select 1 from public.favorites f where f.user_account_id = auth.uid() and f.worker_account_id = p_worker_id) then
    delete from public.favorites where user_account_id = auth.uid() and worker_account_id = p_worker_id;
    return false;
  end if;
  insert into public.favorites(user_account_id, worker_account_id) values(auth.uid(), p_worker_id);
  return true;
end $$;

create or replace function public.fanout_notification_deliveries()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> 'SENT' then return new; end if;
  insert into public.notification_deliveries(notification_id, recipient_id, delivered_at)
  select new.id, a.id, now() from public.accounts a
  where a.status = 'ACTIVE' and a.deleted_at is null and (
    a.id = new.recipient_id or
    (new.recipient_id is null and new.audience = 'EVERYONE') or
    (new.recipient_id is null and new.audience = 'USERS' and a.role = 'USER') or
    (new.recipient_id is null and new.audience = 'WORKERS' and a.role = 'WORKER')
  ) on conflict(notification_id, recipient_id) do nothing;
  return new;
end $$;
create trigger fanout_notification_deliveries after insert or update of status on public.notifications
for each row execute function public.fanout_notification_deliveries();

insert into public.notification_deliveries(notification_id, recipient_id, delivered_at, read_at)
select n.id, a.id, coalesce(n.sent_at, n.created_at), case when n.recipient_id = a.id then n.read_at end
from public.notifications n join public.accounts a on a.status = 'ACTIVE' and a.deleted_at is null
where n.status = 'SENT' and (
  a.id = n.recipient_id or
  (n.recipient_id is null and n.audience = 'EVERYONE') or
  (n.recipient_id is null and n.audience = 'USERS' and a.role = 'USER') or
  (n.recipient_id is null and n.audience = 'WORKERS' and a.role = 'WORKER')
) on conflict(notification_id, recipient_id) do nothing;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  update public.notification_deliveries set read_at = coalesce(read_at, now())
  where notification_id = p_notification_id and recipient_id = auth.uid();
  get diagnostics changed = row_count;
  return changed = 1;
end $$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  update public.conversation_participants set last_read_at = now()
  where conversation_id = p_conversation_id and account_id = auth.uid();
  get diagnostics changed = row_count;
  return changed = 1;
end $$;

create or replace function public.create_support_ticket(
  p_booking_id uuid,
  p_subject text,
  p_description text,
  p_category text,
  p_priority text default 'NORMAL'
)
returns public.support_tickets language plpgsql security definer set search_path = '' as $$
declare result public.support_tickets;
begin
  if p_booking_id is not null and not exists (
    select 1 from public.bookings b where b.id = p_booking_id and auth.uid() in (b.user_account_id, b.worker_account_id)
  ) then raise exception using errcode = '42501', message = 'Booking is unavailable'; end if;
  insert into public.support_tickets(owner_id, booking_id, subject, description, category, priority, last_message_at)
  values(auth.uid(), p_booking_id, trim(p_subject), trim(p_description), upper(trim(p_category)), p_priority, now())
  returning * into result;
  insert into public.support_ticket_messages(ticket_id, sender_id, body)
  values(result.id, auth.uid(), trim(p_description));
  return result;
end $$;

create or replace function public.send_support_message(p_ticket_id uuid, p_body text, p_internal boolean default false)
returns public.support_ticket_messages language plpgsql security definer set search_path = '' as $$
declare ticket public.support_tickets; result public.support_ticket_messages;
begin
  select * into ticket from public.support_tickets where id = p_ticket_id for update;
  if ticket.id is null or (ticket.owner_id <> auth.uid() and not public.is_admin(false)) then
    raise exception using errcode = '42501', message = 'Support ticket is unavailable';
  end if;
  if p_internal and not public.is_admin(false) then raise exception using errcode = '42501', message = 'Administrator required'; end if;
  if ticket.status = 'CLOSED' then raise exception using errcode = '55000', message = 'Support ticket is closed'; end if;
  insert into public.support_ticket_messages(ticket_id, sender_id, body, is_internal)
  values(ticket.id, auth.uid(), trim(p_body), p_internal) returning * into result;
  update public.support_tickets set last_message_at = now() where id = ticket.id;
  return result;
end $$;

create or replace function public.submit_verification_document(
  p_document_type text,
  p_storage_path text,
  p_content_type text,
  p_byte_size integer
)
returns public.worker_verification_documents language plpgsql security definer set search_path = '' as $$
declare verification public.worker_verifications; next_revision integer; result public.worker_verification_documents;
begin
  if public.current_role() <> 'WORKER' or split_part(p_storage_path, '/', 1) <> auth.uid()::text then
    raise exception using errcode = '42501', message = 'Worker document is not allowed';
  end if;
  select * into verification from public.worker_verifications where worker_id = auth.uid() for update;
  if verification.id is null then
    insert into public.worker_verifications(worker_id) values(auth.uid()) returning * into verification;
  end if;
  select coalesce(max(revision), 0) + 1 into next_revision from public.worker_verification_documents
  where verification_id = verification.id and document_type = upper(trim(p_document_type));
  insert into public.worker_verification_documents(
    verification_id, worker_id, document_type, storage_path, content_type, byte_size, revision
  ) values (
    verification.id, auth.uid(), upper(trim(p_document_type)), p_storage_path, p_content_type, p_byte_size, next_revision
  ) returning * into result;
  update public.worker_verifications set status = 'PENDING' where id = verification.id;
  update public.worker_profiles set approval_status = 'PENDING', is_available = false where account_id = auth.uid();
  return result;
end $$;

create or replace function public.upsert_portfolio_item(
  p_id uuid,
  p_category_id uuid,
  p_title text,
  p_description text,
  p_completed_on date,
  p_is_published boolean
)
returns public.worker_portfolio_items language plpgsql security definer set search_path = '' as $$
declare result public.worker_portfolio_items;
begin
  if public.current_role() <> 'WORKER' then raise exception using errcode = '42501', message = 'Worker required'; end if;
  insert into public.worker_portfolio_items(id, worker_id, category_id, title, description, completed_on, is_published)
  values(coalesce(p_id, gen_random_uuid()), auth.uid(), p_category_id, trim(p_title), trim(p_description), p_completed_on, p_is_published)
  on conflict(id) do update set category_id = excluded.category_id, title = excluded.title,
    description = excluded.description, completed_on = excluded.completed_on, is_published = excluded.is_published
  where public.worker_portfolio_items.worker_id = auth.uid()
  returning * into result;
  return result;
end $$;

create or replace function public.attach_portfolio_media(
  p_portfolio_item_id uuid,
  p_storage_path text,
  p_content_type text,
  p_byte_size integer
)
returns public.worker_portfolio_media language plpgsql security definer set search_path = '' as $$
declare result public.worker_portfolio_media;
begin
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text or not exists (
    select 1 from public.worker_portfolio_items i where i.id = p_portfolio_item_id and i.worker_id = auth.uid()
  ) then raise exception using errcode = '42501', message = 'Portfolio attachment is not allowed'; end if;
  insert into public.worker_portfolio_media(portfolio_item_id, storage_path, content_type, byte_size)
  values(p_portfolio_item_id, p_storage_path, p_content_type, p_byte_size) returning * into result;
  return result;
end $$;

do $$
declare signature text;
begin
  foreach signature in array array[
    'update_my_profile(text,jsonb)', 'update_my_preferences(text,text,text,jsonb,jsonb)',
    'upsert_my_address(uuid,text,text,text,text,text,text,text,numeric,numeric,boolean,text,text,text)',
    'archive_my_address(uuid)', 'toggle_favorite(uuid)', 'mark_notification_read(uuid)',
    'mark_conversation_read(uuid)', 'create_support_ticket(uuid,text,text,text,text)',
    'send_support_message(uuid,text,boolean)', 'submit_verification_document(text,text,text,integer)',
    'upsert_portfolio_item(uuid,uuid,text,text,date,boolean)', 'attach_portfolio_media(uuid,text,text,integer)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', signature);
    execute format('grant execute on function public.%s to authenticated', signature);
  end loop;
end $$;

-- ============================================================================
-- 10. Offers, promotions, and cancellations
-- Source: supabase/migrations/20260721000300_offers_promotions_cancellations.sql
-- ============================================================================

-- Worker offers, promotion redemption, authoritative booking price, and richer cancellation records.

create table public.service_request_offers (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(account_id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  message text not null check (length(trim(message)) between 3 and 2000),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 15 and 10080),
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED','UPDATED','ACCEPTED','REJECTED','WITHDRAWN','EXPIRED')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index one_active_offer_per_worker_request on public.service_request_offers(service_request_id, worker_id)
where status in ('SUBMITTED','UPDATED');
create index service_request_offers_request_status_idx on public.service_request_offers(service_request_id, status, created_at desc);

alter table public.bookings
  add column agreed_service_amount numeric(12,2),
  add column currency text not null default 'PHP' check (currency = 'PHP'),
  add column accepted_offer_id uuid references public.service_request_offers(id) on delete restrict;
update public.bookings b set agreed_service_amount = r.budget
from public.service_requests r where r.id = b.service_request_id and b.agreed_service_amount is null;
alter table public.bookings alter column agreed_service_amount set not null;

create or replace function public.select_worker(p_service_request_id uuid, p_worker_id uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare request public.service_requests; result public.bookings; conversation_id uuid;
begin
  select * into request from public.service_requests where id = p_service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') then raise exception using errcode='42501', message='Service request cannot be selected'; end if;
  if not exists(select 1 from public.worker_profiles wp join public.worker_skills ws on ws.worker_id=wp.account_id where wp.account_id=p_worker_id and wp.approval_status='APPROVED' and wp.is_available and ws.category_id=request.category_id) then raise exception using errcode='P0001', message='WORKER_UNAVAILABLE'; end if;
  insert into public.bookings(service_request_id,user_account_id,worker_account_id,agreed_service_amount)
  values(request.id,auth.uid(),p_worker_id,request.budget) returning * into result;
  insert into public.booking_status_events(booking_id,to_status,actor_id) values(result.id,'PENDING',auth.uid());
  insert into public.conversations(booking_id) values(result.id) returning id into conversation_id;
  insert into public.conversation_participants(conversation_id,account_id) values(conversation_id,auth.uid()),(conversation_id,p_worker_id);
  update public.service_requests set status='BOOKED',selected_worker_id=p_worker_id where id=request.id;
  perform pgmq.send('booking_timeouts',jsonb_build_object('booking_id',result.id,'due_at',result.response_due_at,'attempt',0));
  return result;
end $$;

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and length(code) between 3 and 32),
  name text not null check (length(name) between 2 and 120),
  description text not null check (length(description) between 3 and 1000),
  discount_type text not null check (discount_type in ('FIXED','PERCENTAGE')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  maximum_discount numeric(12,2) check (maximum_discount is null or maximum_discount > 0),
  minimum_spend numeric(12,2) not null default 0 check (minimum_spend >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','PAUSED','EXPIRED')),
  total_limit integer check (total_limit is null or total_limit > 0),
  per_user_limit integer not null default 1 check (per_user_limit > 0),
  created_by uuid not null references public.admin_profiles(account_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  check (discount_type <> 'PERCENTAGE' or discount_value <= 100)
);

create table public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete restrict,
  user_account_id uuid not null references public.user_profiles(account_id) on delete restrict,
  service_request_id uuid references public.service_requests(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete restrict,
  discount_amount numeric(12,2) not null check (discount_amount >= 0),
  status text not null default 'RESERVED' check (status in ('RESERVED','REDEEMED','RELEASED')),
  reserved_at timestamptz not null default now(),
  redeemed_at timestamptz,
  released_at timestamptz
);
create index promotion_redemptions_user_idx on public.promotion_redemptions(user_account_id, promotion_id, status);

alter table public.cancellations
  add column reason_code text,
  add column initiator_role public.account_role,
  add column job_stage text check (job_stage is null or job_stage in ('BEFORE_TRAVEL','TRAVELLING','ARRIVED','SERVICE_STARTED')),
  add column fee_amount numeric(12,2) not null default 0 check (fee_amount >= 0),
  add column refund_amount numeric(12,2) not null default 0 check (refund_amount >= 0),
  add column resolution_status text not null default 'CONFIRMED' check (resolution_status in ('PENDING','CONFIRMED','DISPUTED','RESOLVED'));

do $$
declare table_name text;
begin
  foreach table_name in array array['service_request_offers','promotions','promotion_redemptions'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
  end loop;
end $$;
grant select on public.service_request_offers, public.promotions, public.promotion_redemptions to authenticated;

create policy offers_participant_or_admin_read on public.service_request_offers for select to authenticated
using (worker_id = auth.uid() or exists (
  select 1 from public.service_requests r where r.id = service_request_id and r.user_account_id = auth.uid()
) or public.is_admin(false));
create policy active_promotions_read on public.promotions for select to authenticated
using ((status = 'ACTIVE' and now() between starts_at and ends_at) or public.is_admin(false));
create policy promotion_redemptions_owner_or_admin_read on public.promotion_redemptions for select to authenticated
using (user_account_id = auth.uid() or public.is_admin(false));

create trigger set_service_request_offers_updated_at before update on public.service_request_offers
for each row execute function public.set_updated_at();
create trigger set_promotions_updated_at before update on public.promotions
for each row execute function public.set_updated_at();

create or replace function public.submit_service_offer(
  p_service_request_id uuid,
  p_amount numeric,
  p_message text,
  p_estimated_minutes integer default null
)
returns public.service_request_offers language plpgsql security definer set search_path = '' as $$
declare request public.service_requests; result public.service_request_offers;
begin
  if public.current_role() <> 'WORKER' then raise exception using errcode = '42501', message = 'Worker required'; end if;
  select * into request from public.service_requests where id = p_service_request_id for update;
  if request.status not in ('OPEN','MATCHED') or not exists (
    select 1 from public.match_candidates m where m.service_request_id = request.id and m.worker_id = auth.uid() and m.eligible
  ) or not exists (
    select 1 from public.worker_profiles w where w.account_id = auth.uid() and w.approval_status = 'APPROVED' and w.is_available
  ) then raise exception using errcode = '42501', message = 'Offer is not allowed'; end if;
  if p_amount <= 0 or length(trim(p_message)) not between 3 and 2000 then
    raise exception using errcode = '22023', message = 'Invalid offer';
  end if;
  update public.service_request_offers set status = 'UPDATED', amount = round(p_amount, 2), message = trim(p_message),
    estimated_minutes = p_estimated_minutes, expires_at = request.scheduled_at
  where service_request_id = request.id and worker_id = auth.uid() and status in ('SUBMITTED','UPDATED')
  returning * into result;
  if result.id is null then
    insert into public.service_request_offers(service_request_id, worker_id, amount, message, estimated_minutes, expires_at)
    values(request.id, auth.uid(), round(p_amount, 2), trim(p_message), p_estimated_minutes, request.scheduled_at)
    returning * into result;
  end if;
  insert into public.notifications(recipient_id, title, body, category, status, sent_at, source_key)
  values(request.user_account_id, 'New worker offer', 'An approved worker submitted an offer for your service request.',
    'MATCHING', 'SENT', now(), 'offer:' || result.id::text || ':' || result.status)
  on conflict(source_key) do nothing;
  return result;
end $$;

create or replace function public.withdraw_service_offer(p_offer_id uuid)
returns public.service_request_offers language plpgsql security definer set search_path = '' as $$
declare result public.service_request_offers;
begin
  update public.service_request_offers set status = 'WITHDRAWN', responded_at = now()
  where id = p_offer_id and worker_id = auth.uid() and status in ('SUBMITTED','UPDATED')
  returning * into result;
  if result.id is null then raise exception using errcode = '42501', message = 'Offer cannot be withdrawn'; end if;
  return result;
end $$;

create or replace function public.accept_service_offer(p_offer_id uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare offer public.service_request_offers; request public.service_requests; result public.bookings; conversation_id uuid;
begin
  select * into offer from public.service_request_offers where id = p_offer_id for update;
  select * into request from public.service_requests where id = offer.service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') or offer.status not in ('SUBMITTED','UPDATED') then
    raise exception using errcode = '42501', message = 'Offer cannot be accepted';
  end if;
  if not exists (select 1 from public.worker_profiles w where w.account_id = offer.worker_id and w.approval_status = 'APPROVED' and w.is_available) then
    raise exception using errcode = 'P0001', message = 'WORKER_UNAVAILABLE';
  end if;
  update public.service_request_offers set status = case when id = offer.id then 'ACCEPTED' else 'REJECTED' end,
    responded_at = now() where service_request_id = request.id and status in ('SUBMITTED','UPDATED');
  insert into public.bookings(service_request_id, user_account_id, worker_account_id, agreed_service_amount, accepted_offer_id)
  values(request.id, auth.uid(), offer.worker_id, offer.amount, offer.id) returning * into result;
  insert into public.booking_status_events(booking_id, to_status, actor_id) values(result.id, 'PENDING', auth.uid());
  insert into public.conversations(booking_id) values(result.id) returning id into conversation_id;
  insert into public.conversation_participants(conversation_id, account_id) values(conversation_id, auth.uid()), (conversation_id, offer.worker_id);
  update public.service_requests set status = 'BOOKED', selected_worker_id = offer.worker_id, budget = offer.amount where id = request.id;
  perform pgmq.send('booking_timeouts', jsonb_build_object('booking_id', result.id, 'due_at', result.response_due_at, 'attempt', 0));
  return result;
end $$;

create or replace function public.validate_promotion(p_code text, p_amount numeric)
returns table(promotion_id uuid, discount_amount numeric, final_amount numeric)
language plpgsql stable security definer set search_path = '' as $$
declare promotion public.promotions; prior_count integer; total_count integer; discount numeric(12,2);
begin
  select * into promotion from public.promotions where code = upper(trim(p_code)) and status = 'ACTIVE' and now() between starts_at and ends_at;
  if promotion.id is null or p_amount < promotion.minimum_spend then
    raise exception using errcode = '22023', message = 'Promotion is unavailable';
  end if;
  select count(*) into prior_count from public.promotion_redemptions r where r.promotion_id = promotion.id and r.user_account_id = auth.uid() and r.status in ('RESERVED','REDEEMED');
  select count(*) into total_count from public.promotion_redemptions r where r.promotion_id = promotion.id and r.status in ('RESERVED','REDEEMED');
  if prior_count >= promotion.per_user_limit or (promotion.total_limit is not null and total_count >= promotion.total_limit) then
    raise exception using errcode = '22023', message = 'Promotion limit reached';
  end if;
  discount := case when promotion.discount_type = 'FIXED' then promotion.discount_value else round(p_amount * promotion.discount_value / 100, 2) end;
  discount := least(discount, coalesce(promotion.maximum_discount, discount), p_amount);
  return query select promotion.id, discount, p_amount - discount;
end $$;

create or replace function public.reserve_promotion(p_code text, p_service_request_id uuid)
returns public.promotion_redemptions language plpgsql security definer set search_path = '' as $$
declare request public.service_requests; promotion public.promotions; prior_count integer; total_count integer; discount numeric(12,2); result public.promotion_redemptions;
begin
  select * into request from public.service_requests where id = p_service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') then
    raise exception using errcode = '42501', message = 'Service request is unavailable';
  end if;
  select * into promotion from public.promotions where code = upper(trim(p_code)) and status = 'ACTIVE' and now() between starts_at and ends_at for update;
  if promotion.id is null or request.budget < promotion.minimum_spend then raise exception using errcode = '22023', message = 'Promotion is unavailable'; end if;
  select count(*) into prior_count from public.promotion_redemptions r where r.promotion_id = promotion.id and r.user_account_id = auth.uid() and r.status in ('RESERVED','REDEEMED');
  select count(*) into total_count from public.promotion_redemptions r where r.promotion_id = promotion.id and r.status in ('RESERVED','REDEEMED');
  if prior_count >= promotion.per_user_limit or (promotion.total_limit is not null and total_count >= promotion.total_limit) then raise exception using errcode = '22023', message = 'Promotion limit reached'; end if;
  discount := case when promotion.discount_type = 'FIXED' then promotion.discount_value else round(request.budget * promotion.discount_value / 100, 2) end;
  discount := least(discount, coalesce(promotion.maximum_discount, discount), request.budget);
  insert into public.promotion_redemptions(promotion_id, user_account_id, service_request_id, discount_amount)
  values(promotion.id, auth.uid(), request.id, discount) returning * into result;
  update public.service_requests set budget = budget - discount where id = request.id;
  return result;
end $$;

create or replace function public.admin_upsert_promotion(
  p_id uuid,
  p_code text,
  p_name text,
  p_description text,
  p_discount_type text,
  p_discount_value numeric,
  p_maximum_discount numeric,
  p_minimum_spend numeric,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_status text,
  p_total_limit integer,
  p_per_user_limit integer
)
returns public.promotions language plpgsql security definer set search_path = '' as $$
declare result public.promotions;
begin
  if not public.is_admin(true) then raise exception using errcode = '42501', message = 'AAL2 administrator required'; end if;
  insert into public.promotions(
    id, code, name, description, discount_type, discount_value, maximum_discount, minimum_spend,
    starts_at, ends_at, status, total_limit, per_user_limit, created_by
  ) values (
    coalesce(p_id, gen_random_uuid()), upper(trim(p_code)), trim(p_name), trim(p_description), p_discount_type,
    p_discount_value, p_maximum_discount, p_minimum_spend, p_starts_at, p_ends_at, p_status,
    p_total_limit, p_per_user_limit, auth.uid()
  ) on conflict(id) do update set code = excluded.code, name = excluded.name, description = excluded.description,
    discount_type = excluded.discount_type, discount_value = excluded.discount_value,
    maximum_discount = excluded.maximum_discount, minimum_spend = excluded.minimum_spend,
    starts_at = excluded.starts_at, ends_at = excluded.ends_at, status = excluded.status,
    total_limit = excluded.total_limit, per_user_limit = excluded.per_user_limit
  returning * into result;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), 'PROMOTION_UPSERTED', 'promotion', result.id::text, jsonb_build_object('status', result.status, 'code', result.code));
  return result;
end $$;

revoke all on function public.submit_service_offer(uuid,numeric,text,integer) from public, anon;
revoke all on function public.withdraw_service_offer(uuid) from public, anon;
revoke all on function public.accept_service_offer(uuid) from public, anon;
revoke all on function public.validate_promotion(text,numeric) from public, anon;
revoke all on function public.reserve_promotion(text,uuid) from public, anon;
revoke all on function public.admin_upsert_promotion(uuid,text,text,text,text,numeric,numeric,numeric,timestamptz,timestamptz,text,integer,integer) from public, anon;
grant execute on function public.submit_service_offer(uuid,numeric,text,integer) to authenticated;
grant execute on function public.withdraw_service_offer(uuid) to authenticated;
grant execute on function public.accept_service_offer(uuid) to authenticated;
grant execute on function public.validate_promotion(text,numeric) to authenticated;
grant execute on function public.reserve_promotion(text,uuid) to authenticated;
grant execute on function public.admin_upsert_promotion(uuid,text,text,text,text,numeric,numeric,numeric,timestamptz,timestamptz,text,integer,integer) to authenticated;

-- ============================================================================
-- 11. Administrator operations parity
-- Source: supabase/migrations/20260721000400_admin_operations_parity.sql
-- ============================================================================

-- Administrative payout, verification-document, and session-history operations.

create table public.admin_session_history (
  id uuid primary key default gen_random_uuid(),
  admin_account_id uuid not null references public.admin_profiles(account_id) on delete cascade,
  session_id text not null,
  assurance_level text not null check (assurance_level in ('aal1','aal2')),
  user_agent text,
  signed_in_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  signed_out_at timestamptz,
  unique(admin_account_id, session_id)
);
alter table public.admin_session_history enable row level security;
revoke all on public.admin_session_history from anon, authenticated;
grant select on public.admin_session_history to authenticated;
create policy admin_session_history_self_read on public.admin_session_history for select to authenticated
using (admin_account_id = auth.uid() and public.is_admin(false));

create or replace function public.record_admin_session(p_user_agent text default null)
returns public.admin_session_history language plpgsql security definer set search_path = '' as $$
declare result public.admin_session_history; session_identifier text;
begin
  if not public.is_admin(false) then raise exception using errcode = '42501', message = 'Administrator required'; end if;
  session_identifier := coalesce(auth.jwt()->>'session_id', encode(extensions.digest(auth.jwt()::text, 'sha256'), 'hex'));
  insert into public.admin_session_history(admin_account_id, session_id, assurance_level, user_agent)
  values(auth.uid(), session_identifier, coalesce(auth.jwt()->>'aal','aal1'), left(p_user_agent, 500))
  on conflict(admin_account_id, session_id) do update set last_seen_at = now(),
    assurance_level = excluded.assurance_level, user_agent = coalesce(excluded.user_agent, public.admin_session_history.user_agent)
  returning * into result;
  return result;
end $$;

create or replace function public.close_admin_session()
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer; session_identifier text;
begin
  if not public.is_admin(false) then return false; end if;
  session_identifier := coalesce(auth.jwt()->>'session_id', encode(extensions.digest(auth.jwt()::text, 'sha256'), 'hex'));
  update public.admin_session_history set signed_out_at = coalesce(signed_out_at, now()), last_seen_at = now()
  where admin_account_id = auth.uid() and session_id = session_identifier;
  get diagnostics changed = row_count;
  return changed = 1;
end $$;

create or replace function public.admin_decide_payout(
  p_payout_id uuid,
  p_decision text,
  p_provider_reference text default null,
  p_reason text default null
)
returns public.payout_requests language plpgsql security definer set search_path = '' as $$
declare payout public.payout_requests; result public.payout_requests;
begin
  if not public.is_admin(true) or p_decision not in ('PROCESSING','COMPLETED','FAILED') then
    raise exception using errcode = '42501', message = 'AAL2 administrator required';
  end if;
  select * into payout from public.payout_requests where id = p_payout_id for update;
  if payout.id is null or payout.status not in ('PENDING','PROCESSING') then
    raise exception using errcode = '55000', message = 'Payout cannot be updated';
  end if;
  if p_decision = 'FAILED' and length(trim(coalesce(p_reason,''))) < 3 then
    raise exception using errcode = '22023', message = 'Failure reason required';
  end if;
  update public.payout_requests set status = p_decision, provider = case when p_decision = 'COMPLETED' then 'MANUAL_ADMIN' else provider end,
    provider_reference = coalesce(nullif(trim(p_provider_reference), ''), provider_reference),
    failure_reason = case when p_decision = 'FAILED' then trim(p_reason) else null end,
    processed_at = case when p_decision in ('COMPLETED','FAILED') then now() else processed_at end
  where id = payout.id returning * into result;
  if p_decision = 'COMPLETED' then
    update public.wallet_transactions set status = 'COMPLETED' where source_type = 'PAYOUT_REQUEST' and source_id = payout.id and status = 'HELD';
  elsif p_decision = 'FAILED' then
    update public.wallet_transactions set status = 'REVERSED' where source_type = 'PAYOUT_REQUEST' and source_id = payout.id and status = 'HELD';
  end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), 'PAYOUT_' || p_decision, 'payout_request', payout.id::text,
    jsonb_build_object('provider_reference', p_provider_reference, 'reason', p_reason));
  return result;
end $$;

create or replace function public.review_verification_document(
  p_document_id uuid,
  p_decision text,
  p_notes text default null
)
returns public.worker_verification_documents language plpgsql security definer set search_path = '' as $$
declare document public.worker_verification_documents; result public.worker_verification_documents;
begin
  if not public.is_admin(true) or p_decision not in ('APPROVED','REJECTED','NEEDS_REPLACEMENT','EXPIRED') then
    raise exception using errcode = '42501', message = 'AAL2 administrator required';
  end if;
  select * into document from public.worker_verification_documents where id = p_document_id for update;
  if document.id is null or document.status <> 'PENDING' then raise exception using errcode = '55000', message = 'Document cannot be reviewed'; end if;
  update public.worker_verification_documents set status = p_decision, reviewer_id = auth.uid(),
    review_notes = nullif(trim(p_notes), ''), reviewed_at = now()
  where id = document.id returning * into result;
  if p_decision in ('REJECTED','NEEDS_REPLACEMENT','EXPIRED') then
    update public.worker_verifications set status = 'NEEDS_DOCUMENTS', requested_notes = coalesce(nullif(trim(p_notes), ''), 'A verification document must be replaced')
    where id = document.verification_id;
    update public.worker_profiles set approval_status = 'NEEDS_DOCUMENTS', is_available = false where account_id = document.worker_id;
  end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), 'VERIFICATION_DOCUMENT_REVIEWED', 'worker_verification_document', document.id::text,
    jsonb_build_object('decision', p_decision, 'notes', p_notes));
  return result;
end $$;

revoke all on function public.record_admin_session(text) from public, anon;
revoke all on function public.close_admin_session() from public, anon;
revoke all on function public.admin_decide_payout(uuid,text,text,text) from public, anon;
revoke all on function public.review_verification_document(uuid,text,text) from public, anon;
grant execute on function public.record_admin_session(text) to authenticated;
grant execute on function public.close_admin_session() to authenticated;
grant execute on function public.admin_decide_payout(uuid,text,text,text) to authenticated;
grant execute on function public.review_verification_document(uuid,text,text) to authenticated;

-- ============================================================================
-- 12. Historical role compatibility foundation
-- Source: supabase/migrations/20260721000500_session_role_switching.sql
-- ============================================================================

-- Session-scoped User/Worker role switching without mutating the account's original role.

create table public.account_role_memberships (
  account_id uuid not null references public.accounts(id) on delete cascade,
  role public.account_role not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key(account_id, role),
  check (role <> 'ADMIN' or status = 'ACTIVE')
);

create table public.account_session_roles (
  session_id text primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  active_role public.account_role not null,
  switched_at timestamptz not null default now(),
  check (active_role <> 'ADMIN')
);
create index account_session_roles_account_idx on public.account_session_roles(account_id, switched_at desc);

alter table public.account_role_memberships enable row level security;
alter table public.account_session_roles enable row level security;
revoke all on public.account_role_memberships, public.account_session_roles from anon, authenticated;
grant select on public.account_role_memberships to authenticated;

create policy role_memberships_owner_or_admin_read on public.account_role_memberships for select to authenticated
using (account_id = auth.uid() or public.is_admin(true));

insert into public.account_role_memberships(account_id, role)
select id, role from public.accounts on conflict(account_id, role) do nothing;

create or replace function public.provision_primary_role_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.account_role_memberships(account_id, role) values(new.id, new.role)
  on conflict(account_id, role) do nothing;
  return new;
end $$;
create trigger provision_primary_role_membership after insert on public.accounts
for each row execute function public.provision_primary_role_membership();

create or replace function public.current_role()
returns public.account_role language sql stable security definer set search_path = '' as $$
  select coalesce(
    (
      select sr.active_role from public.account_session_roles sr
      join public.account_role_memberships m on m.account_id = sr.account_id and m.role = sr.active_role and m.status = 'ACTIVE'
      where sr.account_id = auth.uid() and sr.session_id = coalesce(auth.jwt()->>'session_id', auth.uid()::text || ':legacy')
    ),
    (
      select a.role from public.accounts a where a.id = auth.uid() and a.status = 'ACTIVE' and a.deleted_at is null
    )
  )
$$;

create or replace function public.enable_secondary_role(p_role public.account_role)
returns public.account_role language plpgsql security definer set search_path = '' as $$
declare primary_role public.account_role; v_display_name text;
begin
  select role into primary_role from public.accounts where id = auth.uid() and status = 'ACTIVE' and deleted_at is null for update;
  if primary_role is null or primary_role = 'ADMIN' or p_role = 'ADMIN' then
    raise exception using errcode = '42501', message = 'Role switching is unavailable';
  end if;
  if p_role = 'USER' then
    select w.display_name into v_display_name from public.worker_profiles w where w.account_id = auth.uid();
    insert into public.user_profiles(account_id, display_name) values(auth.uid(), coalesce(v_display_name, 'A-YOS User'))
    on conflict(account_id) do nothing;
  elsif p_role = 'WORKER' then
    select u.display_name into v_display_name from public.user_profiles u where u.account_id = auth.uid();
    insert into public.worker_profiles(account_id, display_name) values(auth.uid(), coalesce(v_display_name, 'A-YOS Worker'))
    on conflict(account_id) do nothing;
  end if;
  insert into public.account_role_memberships(account_id, role, status) values(auth.uid(), p_role, 'ACTIVE')
  on conflict(account_id, role) do update set status = 'ACTIVE', revoked_at = null;
  return p_role;
end $$;

create or replace function public.switch_active_role(p_role public.account_role)
returns public.account_role language plpgsql security definer set search_path = '' as $$
declare session_identifier text;
begin
  if p_role = 'ADMIN' or not exists (
    select 1 from public.account_role_memberships m where m.account_id = auth.uid() and m.role = p_role and m.status = 'ACTIVE'
  ) then raise exception using errcode = '42501', message = 'Role is unavailable'; end if;
  session_identifier := coalesce(auth.jwt()->>'session_id', auth.uid()::text || ':legacy');
  insert into public.account_session_roles(session_id, account_id, active_role)
  values(session_identifier, auth.uid(), p_role)
  on conflict(session_id) do update set active_role = excluded.active_role, switched_at = now()
  where public.account_session_roles.account_id = auth.uid();
  return p_role;
end $$;

create or replace function public.get_my_role_context()
returns table(primary_role public.account_role, active_role public.account_role, available_roles public.account_role[])
language sql stable security definer set search_path = '' as $$
  select a.role, public.current_role(), array_agg(m.role order by m.role)::public.account_role[]
  from public.accounts a join public.account_role_memberships m on m.account_id = a.id and m.status = 'ACTIVE'
  where a.id = auth.uid() group by a.role
$$;

create or replace function public.generate_matches(p_service_request_id uuid)
returns setof public.match_candidates language plpgsql security definer set search_path='' as $$
declare request public.service_requests; matched_count integer;
begin
  select * into request from public.service_requests where id=p_service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') then raise exception using errcode='42501',message='Service request unavailable'; end if;
  delete from public.match_candidates where service_request_id=request.id;
  insert into public.match_candidates(service_request_id,worker_id,score,rank,factors,eligible)
  select request.id, ranked.worker_id, ranked.score, ranked.rank,
    jsonb_build_object('category',true,'available',true,'years',ranked.years,'rating',ranked.rating,'recommendation_priority',ranked.recommendation_priority),true
  from (
    select wp.account_id worker_id, ws.years, coalesce(avg(r.stars) filter(where r.moderation_status='PUBLISHED'),0)::numeric(3,2) rating,
      wp.recommendation_priority,
      (ws.years*5 + coalesce(avg(r.stars) filter(where r.moderation_status='PUBLISHED'),0)*10 + case when wp.recommendation_priority then 0.01 else 0 end)::numeric(7,4) score,
      row_number() over(order by ws.years*5 + coalesce(avg(r.stars) filter(where r.moderation_status='PUBLISHED'),0)*10 desc,wp.recommendation_priority desc,wp.account_id)::integer rank
    from public.worker_profiles wp join public.worker_skills ws on ws.worker_id=wp.account_id
    left join public.reviews r on r.worker_account_id=wp.account_id
    where wp.account_id <> request.user_account_id and ws.category_id=request.category_id and wp.approval_status='APPROVED' and wp.is_available
      and exists(select 1 from public.worker_availability wa where wa.worker_id=wp.account_id and wa.day_of_week=extract(dow from request.scheduled_at)::integer and request.scheduled_at::time between wa.start_time and wa.end_time)
    group by wp.account_id,ws.years,wp.recommendation_priority
  ) ranked where ranked.rank <= 5;
  get diagnostics matched_count=row_count;
  if matched_count>0 then update public.service_requests set status='MATCHED' where id=request.id;
  else perform pgmq.send('no_match_notifications',jsonb_build_object('service_request_id',request.id,'user_account_id',request.user_account_id),300); end if;
  return query select * from public.match_candidates where public.match_candidates.service_request_id=request.id order by rank;
end $$;

revoke all on function public.enable_secondary_role(public.account_role) from public, anon;
revoke all on function public.switch_active_role(public.account_role) from public, anon;
revoke all on function public.get_my_role_context() from public, anon;
grant execute on function public.enable_secondary_role(public.account_role) to authenticated;
grant execute on function public.switch_active_role(public.account_role) to authenticated;
grant execute on function public.get_my_role_context() to authenticated;

-- ============================================================================
-- 13. Payment invariants
-- Source: supabase/migrations/20260721000600_payment_invariants.sql
-- ============================================================================

-- Cross-method and out-of-order provider event invariants.

create or replace function public.preserve_successful_payment()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'SUCCESSFUL' and new.status <> 'SUCCESSFUL' then return old; end if;
  return new;
end $$;
create trigger preserve_successful_payment before update of status on public.payments
for each row execute function public.preserve_successful_payment();

create or replace function public.preserve_successful_payment_attempt()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'SUCCESSFUL' and new.status <> 'SUCCESSFUL' then return old; end if;
  return new;
end $$;
create trigger preserve_successful_payment_attempt before update of status on public.payment_attempts
for each row execute function public.preserve_successful_payment_attempt();

create or replace function public.confirm_cash_payment(p_booking_id uuid, p_idempotency_key text)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare booking public.bookings; payment public.payments; confirmation_party public.cash_confirmation_party; amount numeric(12,2); rate numeric(5,4); commission numeric(12,2);
begin
  select * into booking from public.bookings where id=p_booking_id for update;
  if booking.status <> 'COMPLETED' or auth.uid() not in (booking.user_account_id,booking.worker_account_id) then raise exception using errcode='42501', message='Cash confirmation not allowed'; end if;
  if length(p_idempotency_key) not between 16 and 128 then raise exception using errcode='22023', message='Invalid idempotency key'; end if;
  select * into payment from public.payments where booking_id = booking.id for update;
  if payment.status = 'SUCCESSFUL' then return payment; end if;
  if payment.id is not null and payment.method = 'GCASH' and payment.status in ('PENDING','AWAITING_CONFIRMATIONS') then
    raise exception using errcode='55000', message='GCash payment is already in progress';
  end if;
  amount := booking.agreed_service_amount;
  rate := 0.1000;
  commission := round(amount*rate,2);
  if payment.id is null then
    insert into public.payments(booking_id,method,status,service_amount,commission_rate,commission_amount,worker_net_amount,idempotency_key)
    values(booking.id,'CASH','AWAITING_CONFIRMATIONS',amount,rate,commission,amount-commission,p_idempotency_key)
    returning * into payment;
  else
    update public.payments set method = 'CASH', status = 'AWAITING_CONFIRMATIONS', provider = null,
      provider_payment_id = null, failure_reason = null, service_amount = amount,
      commission_rate = rate, commission_amount = commission, worker_net_amount = amount - commission
    where id = payment.id returning * into payment;
  end if;
  confirmation_party := case when auth.uid()=booking.user_account_id then 'USER'::public.cash_confirmation_party else 'WORKER'::public.cash_confirmation_party end;
  insert into public.cash_confirmations(payment_id,account_id,party) values(payment.id,auth.uid(),confirmation_party) on conflict(payment_id,party) do nothing;
  if (select count(*) from public.cash_confirmations where payment_id=payment.id)=2 then
    update public.payments set status='SUCCESSFUL',successful_at=coalesce(successful_at,now()),paid_at=coalesce(paid_at,now()) where id=payment.id returning * into payment;
    insert into public.receipts(payment_id,receipt_number,service_amount,commission_rate,commission_amount,worker_net_amount,homeowner_platform_charge)
    values(payment.id,'AYOS-'||upper(substr(replace(payment.id::text,'-',''),1,12)),payment.service_amount,payment.commission_rate,payment.commission_amount,payment.worker_net_amount,payment.homeowner_platform_charge) on conflict(payment_id) do nothing;
  end if;
  return payment;
end $$;

-- ============================================================================
-- 14. Wallet top-ups
-- Source: supabase/migrations/20260721000700_wallet_topups.sql
-- ============================================================================

-- PayMongo GCash top-ups for Worker wallets.

create table public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  status text not null default 'PENDING' check (status in ('PENDING','REQUIRES_ACTION','PROCESSING','SUCCESSFUL','FAILED','EXPIRED','CANCELLED')),
  amount_centavos bigint not null check (amount_centavos between 10000 and 10000000),
  currency text not null default 'PHP' check (currency = 'PHP'),
  provider text not null default 'PAYMONGO' check (provider = 'PAYMONGO'),
  idempotency_key text not null unique check (length(idempotency_key) between 16 and 128),
  provider_intent_id text unique,
  provider_payment_method_id text,
  provider_payment_id text unique,
  redirect_url text,
  return_url text,
  failure_reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index wallet_topups_wallet_time_idx
  on public.wallet_topups(wallet_account_id, created_at desc);

alter table public.wallet_topups enable row level security;
revoke all on public.wallet_topups from anon, authenticated;
grant select on public.wallet_topups to authenticated;

create policy wallet_topups_owner_or_admin_read on public.wallet_topups
for select to authenticated
using (exists (
  select 1 from public.wallet_accounts w
  where w.id = wallet_account_id
    and (w.account_id = auth.uid() or public.is_admin(true))
));

create trigger set_wallet_topups_updated_at before update on public.wallet_topups
for each row execute function public.set_updated_at();

create or replace function public.protect_successful_wallet_topup()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'SUCCESSFUL' and new is distinct from old then
    raise exception using errcode = '55000', message = 'Successful wallet top-up is immutable';
  end if;
  return new;
end $$;

create trigger protect_successful_wallet_topup before update or delete on public.wallet_topups
for each row execute function public.protect_successful_wallet_topup();

create or replace function public.begin_wallet_topup(
  p_amount_centavos bigint,
  p_idempotency_key text
)
returns public.wallet_topups
language plpgsql security definer set search_path = '' as $$
declare
  wallet public.wallet_accounts;
  topup public.wallet_topups;
begin
  if public.current_role() <> 'WORKER'
    or p_amount_centavos not between 10000 and 10000000
    or length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'Invalid wallet top-up request';
  end if;

  select * into topup from public.wallet_topups
  where idempotency_key = p_idempotency_key;
  if topup.id is not null then
    if topup.amount_centavos <> p_amount_centavos then
      raise exception using errcode = '23505', message = 'Idempotency key is already used';
    end if;
    return topup;
  end if;

  insert into public.wallet_accounts(account_id) values (auth.uid())
  on conflict(account_id) do update set updated_at = now()
  returning * into wallet;

  if wallet.status <> 'ACTIVE' then
    raise exception using errcode = '42501', message = 'Active wallet required';
  end if;

  insert into public.wallet_topups(wallet_account_id, amount_centavos, idempotency_key)
  values (wallet.id, p_amount_centavos, p_idempotency_key)
  returning * into topup;
  return topup;
end $$;

create or replace function public.apply_paymongo_wallet_topup_event(
  p_provider_event_id text,
  p_event_type text,
  p_livemode boolean,
  p_payload_hash text,
  p_provider_intent_id text,
  p_provider_payment_id text,
  p_amount_centavos bigint,
  p_failure_reason text default null
)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  topup public.wallet_topups;
  event_id uuid;
begin
  insert into public.payment_provider_events(provider, provider_event_id, event_type, livemode, payload_hash)
  values ('PAYMONGO', p_provider_event_id, p_event_type, p_livemode, p_payload_hash)
  on conflict(provider, provider_event_id) do nothing
  returning id into event_id;
  if event_id is null then return 'DUPLICATE'; end if;

  select * into topup from public.wallet_topups
  where provider_intent_id = p_provider_intent_id for update;
  if topup.id is null then
    update public.payment_provider_events
    set status = 'IGNORED', processed_at = now(), failure_reason = 'Unknown wallet top-up intent'
    where id = event_id;
    return 'IGNORED';
  end if;
  if p_amount_centavos <> topup.amount_centavos then
    update public.payment_provider_events
    set status = 'FAILED', processed_at = now(), failure_reason = 'Amount mismatch'
    where id = event_id;
    return 'AMOUNT_MISMATCH';
  end if;
  if topup.status = 'SUCCESSFUL' then
    update public.payment_provider_events set status = 'PROCESSED', processed_at = now()
    where id = event_id;
    return 'ALREADY_SUCCESSFUL';
  end if;

  if p_event_type in ('payment.paid','payment_intent.succeeded') then
    update public.wallet_topups
    set status = 'SUCCESSFUL',
      provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      completed_at = coalesce(completed_at, now()), failure_reason = null
    where id = topup.id
    returning * into topup;

    insert into public.wallet_transactions(
      wallet_account_id, kind, status, amount, source_type, source_id, description, available_at
    ) values (
      topup.wallet_account_id, 'TOP_UP', 'AVAILABLE', topup.amount_centavos::numeric / 100,
      'WALLET_TOPUP', topup.id, 'GCash wallet top-up', now()
    ) on conflict(wallet_account_id, source_type, source_id, kind) do nothing;
  elsif p_event_type in ('payment.failed','payment_intent.awaiting_payment_method') then
    update public.wallet_topups
    set status = 'FAILED',
      provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      failure_reason = coalesce(nullif(p_failure_reason, ''), 'GCash wallet top-up failed'),
      completed_at = now()
    where id = topup.id;
  else
    update public.payment_provider_events set status = 'IGNORED', processed_at = now()
    where id = event_id;
    return 'IGNORED';
  end if;

  update public.payment_provider_events set status = 'PROCESSED', processed_at = now()
  where id = event_id;
  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values ('PAYMONGO_WALLET_TOPUP_EVENT_PROCESSED', 'wallet_topup', topup.id::text,
    jsonb_build_object('event_type', p_event_type, 'provider_event_id', p_provider_event_id));
  return 'PROCESSED';
end $$;

revoke all on function public.begin_wallet_topup(bigint, text) from public;
grant execute on function public.begin_wallet_topup(bigint, text) to authenticated;
revoke all on function public.apply_paymongo_wallet_topup_event(text, text, boolean, text, text, text, bigint, text) from public;
grant execute on function public.apply_paymongo_wallet_topup_event(text, text, boolean, text, text, text, bigint, text) to service_role;

-- ============================================================================
-- 15. Confirmed User and Worker account deletion
-- Source: supabase/migrations/20260721000800_admin_account_deletion.sql
-- ============================================================================

create or replace function public.admin_delete_account(
  p_account_id uuid,
  p_confirmation_email text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_account public.accounts;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if p_account_id is null or p_account_id = auth.uid() then
    raise exception using errcode = '42501', message = 'ACCOUNT_DELETE_NOT_ALLOWED';
  end if;

  select account.*
  into target_account
  from public.accounts account
  where account.id = p_account_id
  for update;

  if target_account.id is null then
    raise exception using errcode = 'P0002', message = 'ACCOUNT_NOT_FOUND';
  end if;

  if target_account.role = 'ADMIN' or target_account.is_protected then
    raise exception using errcode = '42501', message = 'ADMIN_ACCOUNT_DELETE_NOT_ALLOWED';
  end if;

  if lower(trim(coalesce(p_confirmation_email, ''))) <> lower(target_account.email) then
    raise exception using errcode = '22023', message = 'ACCOUNT_DELETE_CONFIRMATION_MISMATCH';
  end if;

  if exists(select 1 from storage.objects where owner_id = p_account_id::text) then
    raise exception using
      errcode = '23503',
      message = 'ACCOUNT_DELETE_BLOCKED_BY_RELATED_RECORDS',
      detail = 'Remove the account private files through the Storage API before deleting the account.';
  end if;

  begin
    -- If a retained business record references the account, the exception
    -- block rolls back every deletion in this operation.
    delete from public.user_profiles where account_id = p_account_id;
    delete from public.worker_profiles where account_id = p_account_id;
    delete from public.accounts where id = p_account_id;
    delete from auth.users where id = p_account_id;
  exception
    when foreign_key_violation then
      raise exception using
        errcode = '23503',
        message = 'ACCOUNT_DELETE_BLOCKED_BY_RELATED_RECORDS',
        detail = 'Suspend the account when bookings, payments, messages, support, or other retained records exist.';
  end;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'ACCOUNT_DELETED',
    'account',
    p_account_id::text,
    jsonb_build_object(
      'role', target_account.role,
      'email_sha256', encode(extensions.digest(lower(target_account.email), 'sha256'), 'hex')
    )
  );
end
$$;

revoke all on function public.admin_delete_account(uuid, text) from public, anon;
grant execute on function public.admin_delete_account(uuid, text) to authenticated;

-- ============================================================================
-- 16. Complete UI parity contracts
-- Source: supabase/migrations/20260721000900_complete_ui_parity.sql
-- ============================================================================

-- Minimal persisted commands required by the complete Admin reference UI.

create or replace function public.normalize_google_signup_metadata()
returns trigger language plpgsql security definer set search_path = '' as $$
declare display_name text;
begin
  if coalesce(new.raw_app_meta_data->>'provider', '') = 'google'
    and coalesce(new.raw_user_meta_data->>'role', '') = '' then
    display_name := trim(coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1),
      'A-YOS User'
    ));
    if length(display_name) < 2 then display_name := 'A-YOS User'; end if;
    new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'USER', 'name', left(display_name, 120));
  end if;
  return new;
end $$;

create trigger normalize_google_signup_metadata
before insert on auth.users
for each row execute function public.normalize_google_signup_metadata();

create table public.service_templates (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 160),
  description text check (description is null or length(description) <= 2000),
  base_price numeric(12,2) not null check (base_price >= 0),
  estimated_duration_minutes integer not null check (estimated_duration_minutes between 15 and 10080),
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(category_id, name)
);

create index service_templates_catalog_idx
  on public.service_templates(category_id, is_active, name)
  where archived_at is null;

alter table public.service_templates enable row level security;
grant select on public.service_templates to anon, authenticated;

create policy service_templates_public_read on public.service_templates
for select to anon, authenticated
using (
  archived_at is null
  and (
    is_active
    or (select auth.uid()) is not null and public.is_admin(false)
  )
);

create trigger set_service_templates_updated_at
before update on public.service_templates
for each row execute function public.set_updated_at();

create or replace function public.admin_upsert_service_template(
  p_template_id uuid,
  p_category_id uuid,
  p_name text,
  p_description text,
  p_base_price numeric,
  p_estimated_duration_minutes integer,
  p_is_active boolean
) returns public.service_templates
language plpgsql security definer set search_path = '' as $$
declare result public.service_templates;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  if length(trim(coalesce(p_name, ''))) not between 2 and 160
    or (p_description is not null and length(p_description) > 2000)
    or p_base_price is null or p_base_price < 0
    or p_estimated_duration_minutes is null
    or p_estimated_duration_minutes not between 15 and 10080
    or not exists (
      select 1 from public.service_categories category
      where category.id = p_category_id and category.is_active
    ) then
    raise exception using errcode = '22023', message = 'INVALID_SERVICE_TEMPLATE';
  end if;

  if p_template_id is null then
    insert into public.service_templates(
      category_id, name, description, base_price,
      estimated_duration_minutes, is_active
    ) values (
      p_category_id, trim(p_name), nullif(trim(coalesce(p_description, '')), ''),
      p_base_price, p_estimated_duration_minutes, p_is_active
    ) returning * into result;
  else
    update public.service_templates template
    set category_id = p_category_id,
        name = trim(p_name),
        description = nullif(trim(coalesce(p_description, '')), ''),
        base_price = p_base_price,
        estimated_duration_minutes = p_estimated_duration_minutes,
        is_active = p_is_active
    where template.id = p_template_id and template.archived_at is null
    returning * into result;
    if result.id is null then
      raise exception using errcode = 'P0002', message = 'SERVICE_TEMPLATE_NOT_FOUND';
    end if;
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'SERVICE_TEMPLATE_UPSERTED', 'service_template', result.id::text,
    jsonb_build_object('category_id', result.category_id, 'active', result.is_active)
  );
  return result;
end $$;

create or replace function public.admin_duplicate_service_template(p_template_id uuid)
returns public.service_templates
language plpgsql security definer set search_path = '' as $$
declare source public.service_templates; result public.service_templates; copy_name text;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  select template.* into source
  from public.service_templates template
  where template.id = p_template_id and template.archived_at is null;
  if source.id is null then
    raise exception using errcode = 'P0002', message = 'SERVICE_TEMPLATE_NOT_FOUND';
  end if;
  copy_name := left(source.name, 148) || ' (Copy)';
  while exists (
    select 1 from public.service_templates template
    where template.category_id = source.category_id and template.name = copy_name
  ) loop
    copy_name := left(source.name, 138) || ' (Copy ' || substr(gen_random_uuid()::text, 1, 8) || ')';
  end loop;
  insert into public.service_templates(
    category_id, name, description, base_price, estimated_duration_minutes, is_active
  ) values (
    source.category_id, copy_name, source.description, source.base_price,
    source.estimated_duration_minutes, false
  ) returning * into result;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'SERVICE_TEMPLATE_DUPLICATED', 'service_template', result.id::text,
    jsonb_build_object('source_id', source.id)
  );
  return result;
end $$;

create or replace function public.admin_archive_service_template(p_template_id uuid)
returns public.trash_entries
language plpgsql security definer set search_path = '' as $$
declare template public.service_templates; result public.trash_entries;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  update public.service_templates item
  set archived_at = now(), is_active = false
  where item.id = p_template_id and item.archived_at is null
  returning * into template;
  if template.id is null then
    raise exception using errcode = 'P0002', message = 'SERVICE_TEMPLATE_NOT_FOUND';
  end if;
  insert into public.trash_entries(entity_type, entity_id, snapshot, deleted_by)
  values ('service_template', template.id::text, to_jsonb(template), auth.uid())
  returning * into result;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'SERVICE_TEMPLATE_ARCHIVED', 'service_template', template.id::text);
  return result;
end $$;

create or replace function public.restore_from_trash(trash_id uuid)
returns public.trash_entries
language plpgsql security definer set search_path = '' as $$
declare result public.trash_entries;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  select entry.* into result
  from public.trash_entries entry
  where entry.id = trash_id and entry.restored_at is null
  for update;
  if result.id is null then
    raise exception using errcode = 'P0001', message = 'RESTORE_NOT_ALLOWED';
  end if;
  if result.entity_type = 'service_template' then
    update public.service_templates template
    set archived_at = null,
        is_active = coalesce((result.snapshot->>'is_active')::boolean, true)
    where template.id = result.entity_id::uuid and template.archived_at is not null;
    if not found then
      raise exception using errcode = 'P0001', message = 'RESTORE_NOT_ALLOWED';
    end if;
  end if;
  update public.trash_entries entry
  set restored_at = now(), restored_by = auth.uid()
  where entry.id = result.id
  returning * into result;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'RESTORED_FROM_TRASH', result.entity_type, result.entity_id);
  return result;
end $$;

create or replace function public.permanently_delete(p_trash_id uuid, p_confirmation text)
returns void
language plpgsql security definer set search_path = '' as $$
declare entry public.trash_entries;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  select item.* into entry
  from public.trash_entries item
  where item.id = p_trash_id and item.restored_at is null
  for update;
  if entry.id is null then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;
  if trim(coalesce(p_confirmation, '')) <> 'DELETE ' || entry.entity_id then
    raise exception using errcode = '22023', message = 'DELETE_CONFIRMATION_MISMATCH';
  end if;
  if entry.entity_type = 'service_template' then
    delete from public.service_templates template
    where template.id = entry.entity_id::uuid and template.archived_at is not null;
  elsif entry.entity_type = 'review' then
    delete from public.reviews review where review.id = entry.entity_id::uuid;
  else
    raise exception using errcode = '42501', message = 'TRASH_ENTITY_DELETE_NOT_ALLOWED';
  end if;
  delete from public.trash_entries item where item.id = entry.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'PERMANENTLY_DELETED', entry.entity_type, entry.entity_id);
exception when foreign_key_violation then
  raise exception using errcode = '23503', message = 'DELETE_BLOCKED_BY_RELATED_RECORDS';
end $$;

create or replace function public.restore_all_from_trash()
returns integer
language plpgsql security definer set search_path = '' as $$
declare entry public.trash_entries; restored_count integer := 0;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  for entry in
    select item.* from public.trash_entries item
    where item.restored_at is null
    order by item.deleted_at
    for update
  loop
    perform public.restore_from_trash(entry.id);
    restored_count := restored_count + 1;
  end loop;
  return restored_count;
end $$;

create or replace function public.empty_trash(p_confirmation text)
returns integer
language plpgsql security definer set search_path = '' as $$
declare entry public.trash_entries; deleted_count integer := 0;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  if trim(coalesce(p_confirmation, '')) <> 'EMPTY TRASH' then
    raise exception using errcode = '22023', message = 'EMPTY_TRASH_CONFIRMATION_MISMATCH';
  end if;
  for entry in
    select item.* from public.trash_entries item
    where item.restored_at is null and item.entity_type in ('service_template', 'review')
    order by item.deleted_at
    for update
  loop
    if entry.entity_type = 'service_template' then
      delete from public.service_templates template
      where template.id = entry.entity_id::uuid and template.archived_at is not null;
    elsif entry.entity_type = 'review' then
      delete from public.reviews review where review.id = entry.entity_id::uuid;
    end if;
    delete from public.trash_entries item where item.id = entry.id;
    deleted_count := deleted_count + 1;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id)
    values (auth.uid(), 'PERMANENTLY_DELETED', entry.entity_type, entry.entity_id);
  end loop;
  return deleted_count;
exception when foreign_key_violation then
  raise exception using errcode = '23503', message = 'DELETE_BLOCKED_BY_RELATED_RECORDS';
end $$;

revoke all on table public.service_templates from public, anon, authenticated;
grant select on table public.service_templates to anon, authenticated;
revoke all on function public.admin_upsert_service_template(uuid,uuid,text,text,numeric,integer,boolean) from public, anon;
revoke all on function public.admin_duplicate_service_template(uuid) from public, anon;
revoke all on function public.admin_archive_service_template(uuid) from public, anon;
revoke all on function public.permanently_delete(uuid,text) from public, anon;
revoke all on function public.empty_trash(text) from public, anon;
revoke all on function public.restore_all_from_trash() from public, anon;
grant execute on function public.admin_upsert_service_template(uuid,uuid,text,text,numeric,integer,boolean) to authenticated;
grant execute on function public.admin_duplicate_service_template(uuid) to authenticated;
grant execute on function public.admin_archive_service_template(uuid) to authenticated;
grant execute on function public.permanently_delete(uuid,text) to authenticated;
grant execute on function public.empty_trash(text) to authenticated;
grant execute on function public.restore_all_from_trash() to authenticated;

-- ============================================================================
-- 17. Complete backend integration
-- Source: supabase/migrations/20260721001000_complete_backend_integration.sql
-- ============================================================================

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

-- ============================================================================
-- 18. Approved frontend compatibility
-- Source: supabase/migrations/20260722000100_approved_frontend_compatibility.sql
-- ============================================================================

-- Additive compatibility for the approved Vite and Expo frontends.
-- The imported GitHub schema remains authoritative; no existing business rows are replaced.

begin;

alter table public.accounts
  add column if not exists profile_completed_at timestamptz,
  add column if not exists password_changed_at timestamptz;

alter table public.admin_profiles
  add column if not exists given_name text,
  add column if not exists family_name text,
  add column if not exists location text,
  add column if not exists bio text,
  add column if not exists avatar_path text;

alter table public.service_categories
  add column if not exists slug text,
  add column if not exists minimum_price_minor bigint,
  add column if not exists maximum_price_minor bigint,
  add column if not exists is_safety_critical boolean not null default false;

create unique index if not exists service_categories_slug_key
  on public.service_categories(slug) where slug is not null;

create table if not exists public.authentication_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  event_type text not null check (event_type in ('SIGNED_IN','SIGNED_OUT','PASSWORD_CHANGED','MFA_CHANGED')),
  session_id_hash text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists authentication_events_account_created_idx
  on public.authentication_events(account_id, created_at desc);

create table if not exists public.cancellation_reasons (
  code text primary key check (code ~ '^[A-Z0-9_]+$'),
  label text not null check (length(trim(label)) between 2 and 160),
  applies_to text not null check (applies_to in ('USER','WORKER','BOTH')),
  sort_order integer not null default 0,
  is_active boolean not null default true
);

alter table public.authentication_events enable row level security;
alter table public.cancellation_reasons enable row level security;

drop policy if exists authentication_events_owner_or_admin_read on public.authentication_events;
create policy authentication_events_owner_or_admin_read on public.authentication_events
for select to authenticated using (account_id = auth.uid() or public.is_admin(false));

drop policy if exists cancellation_reasons_read on public.cancellation_reasons;
create policy cancellation_reasons_read on public.cancellation_reasons
for select to anon, authenticated using (is_active or public.is_admin(false));

grant select on public.authentication_events to authenticated;
grant select on public.cancellation_reasons to anon, authenticated;
grant select, insert, update, delete on public.authentication_events to service_role;

update public.accounts account
set profile_completed_at = coalesce(account.profile_completed_at, now())
where exists (
  select 1 from public.user_profiles profile
  where profile.account_id = account.id
    and lower(btrim(profile.display_name)) not in ('a-yos user', 'a-yos worker')
  union all
  select 1 from public.worker_profiles profile
  where profile.account_id = account.id
    and lower(btrim(profile.display_name)) not in ('a-yos user', 'a-yos worker')
  union all
  select 1 from public.admin_profiles profile
  where profile.account_id = account.id
    and lower(btrim(profile.display_name)) not in ('administrator', 'a-yos user', 'a-yos worker')
);

update public.accounts account
set profile_completed_at = null
where exists (
  select 1 from public.user_profiles profile
  where profile.account_id = account.id and lower(btrim(profile.display_name)) in ('a-yos user', 'a-yos worker')
  union all
  select 1 from public.worker_profiles profile
  where profile.account_id = account.id and lower(btrim(profile.display_name)) in ('a-yos user', 'a-yos worker')
);

create or replace function public.normalize_google_signup_metadata()
returns trigger language plpgsql security definer set search_path = '' as $$
declare display_name text;
begin
  if coalesce(new.raw_app_meta_data->>'provider', '') = 'google'
    and coalesce(new.raw_user_meta_data->>'role', '') = '' then
    display_name := nullif(trim(coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    )), '');
    if display_name is null or length(display_name) not between 2 and 120 then
      raise exception using errcode = '22023', message = 'PROFILE_NAME_REQUIRED';
    end if;
    new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'USER', 'name', display_name);
  end if;
  return new;
end $$;

create or replace function public.enable_secondary_role(p_role public.account_role)
returns public.account_role language plpgsql security definer set search_path = '' as $$
declare primary_role public.account_role; source_name text;
begin
  select role into primary_role from public.accounts
  where id = auth.uid() and status = 'ACTIVE' and deleted_at is null for update;
  if primary_role is null or primary_role = 'ADMIN' or p_role = 'ADMIN' then
    raise exception using errcode = '42501', message = 'Role switching is unavailable';
  end if;
  if p_role = 'USER' then
    select display_name into source_name from public.worker_profiles where account_id = auth.uid();
    if nullif(btrim(source_name), '') is null then
      raise exception using errcode = '22023', message = 'PROFILE_NAME_REQUIRED';
    end if;
    insert into public.user_profiles(account_id, display_name) values(auth.uid(), source_name)
    on conflict(account_id) do nothing;
  elsif p_role = 'WORKER' then
    select display_name into source_name from public.user_profiles where account_id = auth.uid();
    if nullif(btrim(source_name), '') is null then
      raise exception using errcode = '22023', message = 'PROFILE_NAME_REQUIRED';
    end if;
    insert into public.worker_profiles(account_id, display_name) values(auth.uid(), source_name)
    on conflict(account_id) do nothing;
  end if;
  insert into public.account_role_memberships(account_id, role, status)
  values(auth.uid(), p_role, 'ACTIVE')
  on conflict(account_id, role) do update set status = 'ACTIVE', revoked_at = null;
  return p_role;
end $$;

create or replace function public.get_my_profile() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare account public.accounts; active_role public.account_role; profile jsonb; default_address jsonb;
begin
  if auth.uid() is null then raise exception using errcode='42501', message='AUTHENTICATION_REQUIRED'; end if;
  select * into account from public.accounts where id = auth.uid() and deleted_at is null;
  if account.id is null then raise exception using errcode='P0002', message='ACCOUNT_NOT_FOUND'; end if;
  active_role := public.current_role();
  if active_role = 'USER' then
    select to_jsonb(row) into profile from public.user_profiles row where account_id = account.id;
  elsif active_role = 'WORKER' then
    select to_jsonb(row) into profile from public.worker_profiles row where account_id = account.id;
  elsif active_role = 'ADMIN' then
    select to_jsonb(row) into profile from public.admin_profiles row where account_id = account.id;
  end if;
  select to_jsonb(row) into default_address from public.addresses row
  where account_id = account.id order by is_default desc, created_at desc limit 1;
  return jsonb_build_object(
    'account', to_jsonb(account) - 'is_protected',
    'active_role', active_role,
    'profile', profile,
    'default_address', default_address,
    'email_verified', exists(select 1 from auth.users where id = account.id and email_confirmed_at is not null),
    'profile_complete', account.profile_completed_at is not null
  );
end $$;

create or replace function public.update_my_profile(
  p_display_name text,
  p_mobile text default null,
  p_location text default null,
  p_bio text default null,
  p_given_name text default null,
  p_family_name text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare active_role public.account_role; normalized_name text; normalized_mobile text;
begin
  normalized_name := nullif(btrim(p_display_name), '');
  normalized_mobile := nullif(btrim(p_mobile), '');
  if normalized_name is null or length(normalized_name) not between 2 and 120 then
    raise exception using errcode='22023', message='INVALID_DISPLAY_NAME';
  end if;
  if normalized_mobile is not null and normalized_mobile !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception using errcode='22023', message='INVALID_MOBILE';
  end if;
  update public.accounts set mobile = normalized_mobile, updated_at = now()
  where id = auth.uid() and deleted_at is null;
  active_role := public.current_role();
  if active_role = 'USER' then
    update public.user_profiles set display_name = normalized_name, updated_at = now() where account_id = auth.uid();
  elsif active_role = 'WORKER' then
    update public.worker_profiles set display_name = normalized_name, bio = nullif(btrim(p_bio), ''),
      service_area = nullif(btrim(p_location), ''), updated_at = now() where account_id = auth.uid();
  elsif active_role = 'ADMIN' then
    update public.admin_profiles set display_name = normalized_name,
      given_name = nullif(btrim(p_given_name), ''), family_name = nullif(btrim(p_family_name), ''),
      location = nullif(btrim(p_location), ''), bio = nullif(btrim(p_bio), ''), updated_at = now()
    where account_id = auth.uid();
  end if;
  if not found then raise exception using errcode='P0002', message='PROFILE_NOT_FOUND'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values(auth.uid(), 'PROFILE_UPDATED', 'account', auth.uid()::text);
  return public.get_my_profile();
end $$;

create or replace function public.complete_my_profile(
  p_display_name text,
  p_mobile text default null,
  p_location text default null,
  p_bio text default null,
  p_given_name text default null,
  p_family_name text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform public.update_my_profile(p_display_name, p_mobile, p_location, p_bio, p_given_name, p_family_name);
  update public.accounts set profile_completed_at = now(), updated_at = now() where id = auth.uid();
  return public.get_my_profile();
end $$;

create or replace function public.set_my_avatar(p_storage_path text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare active_role public.account_role; normalized_path text;
begin
  normalized_path := nullif(btrim(p_storage_path), '');
  if normalized_path is not null and split_part(normalized_path, '/', 1) <> auth.uid()::text then
    raise exception using errcode='42501', message='INVALID_AVATAR_PATH';
  end if;
  active_role := public.current_role();
  if active_role = 'USER' then
    update public.user_profiles set avatar_path = normalized_path, updated_at = now() where account_id = auth.uid();
  elsif active_role = 'WORKER' then
    update public.worker_profiles set avatar_path = normalized_path, updated_at = now() where account_id = auth.uid();
  elsif active_role = 'ADMIN' then
    update public.admin_profiles set avatar_path = normalized_path, updated_at = now() where account_id = auth.uid();
  end if;
  if not found then raise exception using errcode='P0002', message='PROFILE_NOT_FOUND'; end if;
  return public.get_my_profile();
end $$;

create or replace function public.record_my_password_change() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare changed_at timestamptz := now();
begin
  update public.accounts set password_changed_at = changed_at, updated_at = changed_at where id = auth.uid();
  if not found then raise exception using errcode='P0002', message='ACCOUNT_NOT_FOUND'; end if;
  insert into public.authentication_events(account_id, event_type, created_at)
  values(auth.uid(), 'PASSWORD_CHANGED', changed_at);
  return changed_at;
end $$;

create or replace function public.admin_dashboard_metrics() returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.get_admin_dashboard_metrics(now() - interval '30 days', now())
$$;

create or replace function public.admin_upsert_category(p_id uuid, p_name text, p_is_active boolean)
returns public.service_categories language sql security definer set search_path = '' as $$
  select public.admin_upsert_service_category(p_id, p_name, null, p_is_active)
$$;

create or replace function public.admin_upsert_service(
  p_id uuid, p_name text, p_category_id uuid, p_minimum_price_minor bigint,
  p_maximum_price_minor bigint, p_duration_minutes integer, p_is_active boolean
) returns public.service_templates language sql security definer set search_path = '' as $$
  select public.admin_upsert_service_template(
    p_id, p_category_id, p_name, null, p_minimum_price_minor::numeric / 100,
    p_duration_minutes, p_is_active
  )
$$;

create or replace function public.admin_set_worker_availability(p_worker_id uuid, p_available boolean)
returns public.worker_profiles language plpgsql security definer set search_path = '' as $$
declare result public.worker_profiles;
begin
  if not public.is_admin(true) then raise exception using errcode='42501', message='AAL2_ADMIN_REQUIRED'; end if;
  update public.worker_profiles set is_available = p_available, updated_at = now()
  where account_id = p_worker_id returning * into result;
  if result.account_id is null then raise exception using errcode='P0002', message='WORKER_NOT_FOUND'; end if;
  return result;
end $$;

create or replace function public.submit_request_bid(
  p_service_request_id uuid, p_amount_minor bigint, p_message text, p_duration_minutes integer
) returns public.service_request_offers language sql security definer set search_path = '' as $$
  select public.submit_service_offer(
    p_service_request_id, p_amount_minor::numeric / 100, p_message, p_duration_minutes
  )
$$;

create or replace function public.submit_worker_application(
  p_identity_data jsonb, p_document_paths text[], p_bio text, p_experience text
) returns public.worker_verifications language plpgsql security definer set search_path = '' as $$
declare result public.worker_verifications;
begin
  update public.worker_profiles set bio = nullif(btrim(p_bio), ''), experience = nullif(btrim(p_experience), ''), updated_at = now()
  where account_id = auth.uid();
  if not found then raise exception using errcode='42501', message='WORKER_ROLE_REQUIRED'; end if;
  result := public.submit_worker_onboarding_identity(p_identity_data, p_document_paths);
  return result;
end $$;

revoke all on function public.get_my_profile() from public, anon;
revoke all on function public.update_my_profile(text,text,text,text,text,text) from public, anon;
revoke all on function public.complete_my_profile(text,text,text,text,text,text) from public, anon;
revoke all on function public.set_my_avatar(text) from public, anon;
revoke all on function public.record_my_password_change() from public, anon;
revoke all on function public.admin_dashboard_metrics() from public, anon;
revoke all on function public.admin_upsert_category(uuid,text,boolean) from public, anon;
revoke all on function public.admin_upsert_service(uuid,text,uuid,bigint,bigint,integer,boolean) from public, anon;
revoke all on function public.admin_set_worker_availability(uuid,boolean) from public, anon;
revoke all on function public.submit_request_bid(uuid,bigint,text,integer) from public, anon;
revoke all on function public.submit_worker_application(jsonb,text[],text,text) from public, anon;

grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.update_my_profile(text,text,text,text,text,text) to authenticated;
grant execute on function public.complete_my_profile(text,text,text,text,text,text) to authenticated;
grant execute on function public.set_my_avatar(text) to authenticated;
grant execute on function public.record_my_password_change() to authenticated;
grant execute on function public.admin_dashboard_metrics() to authenticated;
grant execute on function public.admin_upsert_category(uuid,text,boolean) to authenticated;
grant execute on function public.admin_upsert_service(uuid,text,uuid,bigint,bigint,integer,boolean) to authenticated;
grant execute on function public.admin_set_worker_availability(uuid,boolean) to authenticated;
grant execute on function public.submit_request_bid(uuid,bigint,text,integer) to authenticated;
grant execute on function public.submit_worker_application(jsonb,text[],text,text) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy profile_avatars_owner_upload on storage.objects for insert to authenticated
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy profile_avatars_authenticated_read on storage.objects for select to authenticated
using (bucket_id = 'profile-avatars');
create policy profile_avatars_owner_update on storage.objects for update to authenticated
using (bucket_id = 'profile-avatars' and owner_id = auth.uid()::text)
with check (bucket_id = 'profile-avatars' and owner_id = auth.uid()::text);
create policy profile_avatars_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'profile-avatars' and owner_id = auth.uid()::text);

insert into public.cancellation_reasons(code, label, applies_to, sort_order) values
  ('SCHEDULE_CHANGED', 'Schedule changed', 'BOTH', 10),
  ('WORKER_UNAVAILABLE', 'Worker unavailable', 'WORKER', 20),
  ('CUSTOMER_UNAVAILABLE', 'Customer unavailable', 'USER', 30),
  ('PRICE_DISAGREEMENT', 'Price disagreement', 'BOTH', 40),
  ('OTHER', 'Other', 'BOTH', 100)
on conflict(code) do update set label = excluded.label, applies_to = excluded.applies_to,
  sort_order = excluded.sort_order;

commit;

-- ============================================================================
-- 19. AI and geocoding frontend contracts
-- Source: supabase/migrations/20260722000200_ai_geocoding_frontend_contract.sql
-- ============================================================================

-- Queued AI and OpenRouteService contracts used by the approved Expo request flow.

begin;

alter table public.addresses
  add column if not exists geocoding_provider text,
  add column if not exists geocoding_provider_id text,
  add column if not exists geocoding_confidence numeric(5,4),
  add column if not exists geocoding_payload jsonb;

create or replace view public.services with (security_invoker = true) as
select template.id,
  template.category_id,
  template.name,
  template.description,
  round(template.base_price * 100)::bigint as minimum_price_minor,
  round(template.base_price * 100)::bigint as maximum_price_minor,
  template.estimated_duration_minutes,
  category.is_safety_critical,
  template.is_active,
  template.created_at,
  template.updated_at
from public.service_templates template
join public.service_categories category on category.id = template.category_id
where template.archived_at is null;

grant select on public.services to anon, authenticated, service_role;

create table public.ai_processing_consents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  consent_version text not null,
  providers text[] not null check (providers <@ array['GEMINI','OPENAI']::text[]),
  media_processing boolean not null default false,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  request_correlation_id text not null,
  unique(account_id, request_correlation_id)
);

create table public.ai_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  consent_id uuid not null references public.ai_processing_consents(id) on delete restrict,
  service_request_id uuid references public.service_requests(id) on delete set null,
  analysis_id uuid references public.ai_analyses(id) on delete set null,
  idempotency_key text not null check (length(idempotency_key) between 16 and 128),
  status text not null default 'QUEUED' check (status in ('QUEUED','PROCESSING','SUCCEEDED','FAILED','CANCELLED')),
  description text not null check (length(description) between 10 and 4000),
  media_paths jsonb not null default '[]',
  input_locale text,
  result jsonb,
  error_code text,
  error_message text,
  retryable boolean not null default false,
  correlation_id text not null default gen_random_uuid()::text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, idempotency_key)
);

create index ai_analysis_jobs_status_created_idx on public.ai_analysis_jobs(status, created_at);

alter table public.ai_analysis_attempts
  add column if not exists job_id uuid references public.ai_analysis_jobs(id) on delete set null,
  add column if not exists correlation_id text,
  add column if not exists usage_metadata jsonb not null default '{}',
  add column if not exists http_status integer;

create table public.geocoding_cache (
  cache_key text primary key,
  operation text not null check (operation in ('SEARCH','REVERSE','ROUTE')),
  normalized_request jsonb not null,
  normalized_response jsonb not null,
  provider text not null default 'OPENROUTESERVICE',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index geocoding_cache_expiry_idx on public.geocoding_cache(expires_at);

create table public.route_snapshots (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  requested_by uuid not null references public.accounts(id) on delete restrict,
  route_geojson jsonb not null,
  distance_meters integer not null check (distance_meters >= 0),
  duration_seconds integer not null check (duration_seconds >= 0),
  worker_location extensions.geography(Point,4326) not null,
  destination extensions.geography(Point,4326) not null,
  created_at timestamptz not null default now()
);

create index route_snapshots_booking_created_idx on public.route_snapshots(booking_id, created_at desc);

alter table public.ai_processing_consents enable row level security;
alter table public.ai_analysis_jobs enable row level security;
alter table public.geocoding_cache enable row level security;
alter table public.route_snapshots enable row level security;

create policy ai_consents_owner_read on public.ai_processing_consents for select to authenticated
using (account_id = auth.uid() or public.is_admin(false));
create policy ai_consents_owner_insert on public.ai_processing_consents for insert to authenticated
with check (account_id = auth.uid());
create policy ai_jobs_owner_read on public.ai_analysis_jobs for select to authenticated
using (account_id = auth.uid() or public.is_admin(false));
create policy route_snapshots_booking_parties on public.route_snapshots for select to authenticated
using (public.is_booking_party(booking_id) or public.is_admin(false));

grant select, insert on public.ai_processing_consents to authenticated;
grant select on public.ai_analysis_jobs, public.route_snapshots to authenticated;
grant select, insert, update, delete on public.ai_processing_consents, public.ai_analysis_jobs,
  public.geocoding_cache, public.route_snapshots to service_role;

create or replace function public.save_geocoded_address(
  p_label text, p_line1 text, p_line2 text, p_barangay text, p_city text, p_province text,
  p_postal_code text, p_latitude numeric, p_longitude numeric, p_provider_id text,
  p_confidence numeric, p_payload jsonb, p_is_default boolean default false
) returns public.addresses language plpgsql security definer set search_path = '' as $$
declare result public.addresses;
begin
  if p_latitude not between 4.0 and 22.0 or p_longitude not between 116.0 and 127.0 then
    raise exception using errcode='22023', message='OUTSIDE_PHILIPPINES';
  end if;
  if nullif(btrim(p_line1), '') is null or nullif(btrim(p_barangay), '') is null
    or nullif(btrim(p_city), '') is null or nullif(btrim(p_province), '') is null then
    raise exception using errcode='22023', message='ADDRESS_COMPONENTS_REQUIRED';
  end if;
  if p_confidence is not null and p_confidence not between 0 and 1 then
    raise exception using errcode='22023', message='INVALID_GEOCODING_CONFIDENCE';
  end if;
  if p_is_default then update public.addresses set is_default = false where account_id = auth.uid(); end if;
  insert into public.addresses(
    account_id, label, line1, line2, barangay, city, province, postal_code, is_default,
    location, geocoding_provider, geocoding_provider_id, geocoding_confidence, geocoding_payload
  ) values (
    auth.uid(), btrim(p_label), btrim(p_line1), nullif(btrim(p_line2), ''), btrim(p_barangay),
    btrim(p_city), btrim(p_province), nullif(btrim(p_postal_code), ''), p_is_default,
    private.make_location(p_latitude, p_longitude), 'OPENROUTESERVICE', p_provider_id,
    p_confidence, coalesce(p_payload, '{}')
  ) returning * into result;
  return result;
end $$;

revoke all on function public.save_geocoded_address(text,text,text,text,text,text,text,numeric,numeric,text,numeric,jsonb,boolean)
  from public, anon;
grant execute on function public.save_geocoded_address(text,text,text,text,text,text,text,numeric,numeric,text,numeric,jsonb,boolean)
  to authenticated;

insert into public.system_settings(key, value) values
  ('ai.enabled', 'false'),
  ('ai.consent_version', '"2026-07-21"'),
  ('ai.per_user_daily_quota', '20'),
  ('ai.platform_monthly_budget_minor', '0'),
  ('ai.max_concurrency', '4'),
  ('ai.timeout_ms', '45000'),
  ('ai.circuit_breaker_failures', '5'),
  ('geocoding.enabled', 'true')
on conflict(key) do nothing;

alter publication supabase_realtime add table public.ai_analysis_jobs;

commit;

-- ============================================================================
-- 20. Administrator frontend commands
-- Source: supabase/migrations/20260722000300_admin_frontend_commands.sql
-- ============================================================================

begin;

create or replace function public.admin_create_notification_draft(
  p_audience public.notification_audience,
  p_title text,
  p_body text,
  p_category text default 'GENERAL'
) returns public.notifications
language plpgsql security definer set search_path = '' as $$
declare result public.notifications;
begin
  if not public.is_admin(true) then raise exception using errcode='42501', message='AAL2_ADMIN_REQUIRED'; end if;
  if length(trim(p_title)) not between 1 and 160 or length(trim(p_body)) not between 1 and 4000
    or length(trim(p_category)) not between 1 and 80 then
    raise exception using errcode='22023', message='INVALID_NOTIFICATION';
  end if;
  insert into public.notifications(audience, title, body, category, status)
  values(p_audience, trim(p_title), trim(p_body), upper(trim(p_category)), 'DRAFT')
  returning * into result;
  return result;
end $$;

create or replace function public.admin_publish_campaign(p_campaign_id uuid)
returns public.notifications language sql security definer set search_path = '' as $$
  select public.admin_send_notification_now(p_campaign_id)
$$;

revoke all on function public.admin_create_notification_draft(public.notification_audience,text,text,text) from public, anon;
revoke all on function public.admin_publish_campaign(uuid) from public, anon;
grant execute on function public.admin_create_notification_draft(public.notification_audience,text,text,text) to authenticated;
grant execute on function public.admin_publish_campaign(uuid) to authenticated;

commit;

-- ============================================================================
-- 21. Permanent single-role account enforcement
-- Source: supabase/migrations/20260722000400_single_role_accounts.sql
-- ============================================================================

-- Every Auth identity has one immutable primary application role.
-- Historical secondary profiles/memberships remain stored but cannot grant access.

update public.account_role_memberships membership
set status = 'REVOKED', revoked_at = coalesce(membership.revoked_at, now())
from public.accounts account
where account.id = membership.account_id
  and membership.role <> account.role
  and membership.status <> 'REVOKED';

insert into public.account_role_memberships(account_id, role, status, revoked_at)
select id, role, 'ACTIVE', null from public.accounts
on conflict(account_id, role) do update
set status = 'ACTIVE', revoked_at = null;

-- Session selections are ephemeral authorization state, not business history.
delete from public.account_session_roles;

create or replace function public.enforce_primary_role_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'ACTIVE' and not exists (
    select 1 from public.accounts account
    where account.id = new.account_id and account.role = new.role
  ) then
    raise exception using errcode = '42501', message = 'SECONDARY_ROLES_DISABLED';
  end if;
  return new;
end $$;

drop trigger if exists enforce_primary_role_membership on public.account_role_memberships;
create trigger enforce_primary_role_membership
before insert or update on public.account_role_memberships
for each row execute function public.enforce_primary_role_membership();

create or replace function public.reject_session_role_selection()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  raise exception using errcode = '42501', message = 'ROLE_SWITCHING_DISABLED';
end $$;

drop trigger if exists reject_session_role_selection on public.account_session_roles;
create trigger reject_session_role_selection
before insert or update on public.account_session_roles
for each row execute function public.reject_session_role_selection();

create or replace function public.current_role()
returns public.account_role language sql stable security definer set search_path = '' as $$
  select account.role from public.accounts account
  where account.id = auth.uid() and account.status = 'ACTIVE' and account.deleted_at is null
$$;

create or replace function public.normalize_google_signup_metadata()
returns trigger language plpgsql security definer set search_path = '' as $$
declare display_name text;
begin
  if coalesce(new.raw_app_meta_data->>'provider', '') = 'google' then
    display_name := nullif(trim(coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    )), '');
    if display_name is null or length(display_name) not between 2 and 120 then
      raise exception using errcode = '22023', message = 'PROFILE_NAME_REQUIRED';
    end if;
    new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'USER', 'name', display_name);
  end if;
  return new;
end $$;

create or replace function public.get_my_profile()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare account public.accounts; profile jsonb; default_address jsonb;
begin
  if auth.uid() is null then raise exception using errcode='42501', message='AUTHENTICATION_REQUIRED'; end if;
  select * into account from public.accounts where id = auth.uid() and deleted_at is null;
  if account.id is null then raise exception using errcode='P0002', message='ACCOUNT_NOT_FOUND'; end if;
  if account.role = 'USER' then
    select to_jsonb(row) into profile from public.user_profiles row where account_id = account.id;
  elsif account.role = 'WORKER' then
    select to_jsonb(row) into profile from public.worker_profiles row where account_id = account.id;
  elsif account.role = 'ADMIN' then
    select to_jsonb(row) into profile from public.admin_profiles row where account_id = account.id;
  end if;
  select to_jsonb(row) into default_address from public.addresses row
  where account_id = account.id order by is_default desc, created_at desc limit 1;
  return jsonb_build_object(
    'account', to_jsonb(account) - 'is_protected',
    'active_role', account.role,
    'profile', profile,
    'default_address', default_address,
    'email_verified', exists(select 1 from auth.users where id = account.id and email_confirmed_at is not null),
    'profile_complete', account.profile_completed_at is not null
  );
end $$;

create or replace function public.submit_worker_application(
  p_identity_data jsonb, p_document_paths text[], p_bio text, p_experience text
) returns public.worker_verifications language plpgsql security definer set search_path = '' as $$
declare result public.worker_verifications;
begin
  if not exists (
    select 1 from public.accounts account
    where account.id = auth.uid() and account.role = 'WORKER'
      and account.status = 'ACTIVE' and account.deleted_at is null
  ) then
    raise exception using errcode='42501', message='WORKER_ROLE_REQUIRED';
  end if;
  update public.worker_profiles
  set bio = nullif(btrim(p_bio), ''), experience = nullif(btrim(p_experience), ''), updated_at = now()
  where account_id = auth.uid();
  if not found then raise exception using errcode='P0002', message='WORKER_PROFILE_NOT_FOUND'; end if;
  result := public.submit_worker_onboarding_identity(p_identity_data, p_document_paths);
  update public.accounts set profile_completed_at = coalesce(profile_completed_at, now()), updated_at = now()
  where id = auth.uid();
  return result;
end $$;

revoke all on function public.enable_secondary_role(public.account_role) from public, anon, authenticated;
revoke all on function public.switch_active_role(public.account_role) from public, anon, authenticated;
revoke all on function public.get_my_role_context() from public, anon, authenticated;
drop function public.enable_secondary_role(public.account_role);
drop function public.switch_active_role(public.account_role);
drop function public.get_my_role_context();

revoke all on function public.enforce_primary_role_membership() from public, anon, authenticated;
revoke all on function public.reject_session_role_selection() from public, anon, authenticated;


-- ============================================================================
-- 22. Industry and skill taxonomy
-- Source: supabase/migrations/20260722000500_industry_skill_taxonomy.sql
-- ============================================================================

-- Normalized, database-backed industry and skill taxonomy for worker onboarding.
-- Existing service category rows and identifiers are preserved.

begin;

create table if not exists public.industries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique check (length(btrim(name)) between 2 and 120),
  description text check (description is null or length(btrim(description)) between 2 and 1000),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The hosted authoritative schema already contains an earlier industries table
-- without display ordering. CREATE TABLE IF NOT EXISTS does not add columns.
alter table public.industries
  add column if not exists sort_order integer not null default 0 check (sort_order >= 0);

alter table public.service_categories
  add column if not exists industry_id uuid references public.industries(id) on delete restrict;

alter table public.worker_profiles
  add column if not exists primary_industry_id uuid references public.industries(id) on delete restrict;

create index if not exists industries_active_order_idx
  on public.industries(sort_order, name) where is_active;
create index if not exists service_categories_industry_active_name_idx
  on public.service_categories(industry_id, is_active, name);
create index if not exists worker_profiles_primary_industry_idx
  on public.worker_profiles(primary_industry_id) where primary_industry_id is not null;

drop trigger if exists set_updated_at on public.industries;
create trigger set_updated_at before update on public.industries
for each row execute function public.set_updated_at();

alter table public.industries enable row level security;

drop policy if exists industries_public_read on public.industries;
create policy industries_public_read on public.industries
for select to anon, authenticated
using (is_active or public.is_admin(false));

drop policy if exists industries_admin_write on public.industries;
create policy industries_admin_write on public.industries
for all to authenticated
using (public.is_admin(true))
with check (public.is_admin(true));

grant select on public.industries to anon, authenticated;
grant insert, update, delete on public.industries to authenticated;

insert into public.industries(slug, name, description, sort_order, is_active)
values
  ('cleaning', 'Cleaning', 'Residential and property cleaning services.', 10, true),
  ('electrical', 'Electrical', 'Electrical installation, maintenance, and repair services.', 20, true),
  ('plumbing', 'Plumbing', 'Plumbing installation, maintenance, and repair services.', 30, true),
  ('carpentry', 'Carpentry', 'Woodwork, furniture, fixture, and partition services.', 40, true),
  ('painting', 'Painting', 'Interior, exterior, and decorative painting services.', 50, true),
  ('masonry-tiling', 'Masonry & Tiling', 'Masonry, concrete, plastering, and tile services.', 60, true),
  ('air-conditioning-refrigeration', 'Air Conditioning & Refrigeration', 'Cooling and refrigeration installation, maintenance, and repair services.', 70, true),
  ('appliance-repair', 'Appliance Repair', 'Household and small-appliance diagnosis and repair services.', 80, true),
  ('landscaping-gardening', 'Landscaping & Gardening', 'Garden, lawn, planting, irrigation, and yard services.', 90, true),
  ('roofing-waterproofing', 'Roofing & Waterproofing', 'Roof, gutter, leak, and waterproofing services.', 100, true)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

with catalog(industry_slug, skill_slug, skill_name, skill_description) as (
  values
    ('cleaning', 'cleaning', 'Cleaning', 'General home and property cleaning.'),
    ('cleaning', 'deep-cleaning', 'Deep Cleaning', 'Detailed cleaning of high-use and hard-to-reach areas.'),
    ('cleaning', 'move-in-move-out-cleaning', 'Move-In/Move-Out Cleaning', 'Cleaning before occupancy or after vacating a property.'),
    ('cleaning', 'post-construction-cleaning', 'Post-Construction Cleaning', 'Removal of construction dust and debris after completed work.'),
    ('cleaning', 'carpet-upholstery-cleaning', 'Carpet & Upholstery Cleaning', 'Cleaning of carpets, rugs, and upholstered furniture.'),
    ('electrical', 'electrical', 'Electrical', 'General electrical diagnosis and repair.'),
    ('electrical', 'wiring-rewiring', 'Wiring & Rewiring', 'Installation or replacement of electrical wiring.'),
    ('electrical', 'lighting-installation', 'Lighting Installation', 'Installation and replacement of lighting fixtures.'),
    ('electrical', 'outlet-switch-installation', 'Outlet & Switch Installation', 'Installation and repair of outlets and switches.'),
    ('electrical', 'panel-circuit-breaker-service', 'Panel & Circuit Breaker Service', 'Inspection, repair, and replacement of panels and breakers.'),
    ('plumbing', 'plumbing', 'Plumbing', 'General plumbing diagnosis and repair.'),
    ('plumbing', 'leak-detection-repair', 'Leak Detection & Repair', 'Detection and repair of water leaks.'),
    ('plumbing', 'drain-unclogging', 'Drain Unclogging', 'Clearing blocked sinks, drains, and waste lines.'),
    ('plumbing', 'fixture-installation', 'Fixture Installation', 'Installation and replacement of plumbing fixtures.'),
    ('plumbing', 'pipe-installation-repair', 'Pipe Installation & Repair', 'Installation, replacement, and repair of water pipes.'),
    ('carpentry', 'furniture-repair', 'Furniture Repair', 'Repair and restoration of wooden furniture.'),
    ('carpentry', 'cabinet-installation-repair', 'Cabinet Installation & Repair', 'Installation, alignment, and repair of cabinets.'),
    ('carpentry', 'door-window-repair', 'Door & Window Repair', 'Repair and adjustment of wooden doors and windows.'),
    ('carpentry', 'custom-woodwork', 'Custom Woodwork', 'Made-to-measure wood fixtures and furnishings.'),
    ('carpentry', 'ceiling-partition-installation', 'Ceiling & Partition Installation', 'Installation and repair of ceilings and room partitions.'),
    ('painting', 'interior-painting', 'Interior Painting', 'Painting of indoor walls, ceilings, and fixtures.'),
    ('painting', 'exterior-painting', 'Exterior Painting', 'Weather-resistant painting of exterior surfaces.'),
    ('painting', 'repainting-touch-ups', 'Repainting & Touch-Ups', 'Refresh coats and localized paint repairs.'),
    ('painting', 'surface-preparation', 'Surface Preparation', 'Cleaning, sanding, patching, and priming before painting.'),
    ('painting', 'decorative-finishing', 'Decorative Finishing', 'Decorative paint effects and specialty finishes.'),
    ('masonry-tiling', 'tile-installation-repair', 'Tile Installation & Repair', 'Installation and replacement of wall and floor tiles.'),
    ('masonry-tiling', 'concrete-repair', 'Concrete Repair', 'Repair of damaged concrete surfaces and minor structures.'),
    ('masonry-tiling', 'wall-fence-construction', 'Wall & Fence Construction', 'Construction and repair of masonry walls and fences.'),
    ('masonry-tiling', 'plastering-rendering', 'Plastering & Rendering', 'Application and repair of plaster and cement render.'),
    ('masonry-tiling', 'minor-demolition', 'Minor Demolition', 'Controlled removal of small non-structural masonry work.'),
    ('air-conditioning-refrigeration', 'aircon-cleaning-maintenance', 'Aircon Cleaning & Maintenance', 'Routine cleaning and preventive maintenance of air conditioners.'),
    ('air-conditioning-refrigeration', 'aircon-installation', 'Aircon Installation', 'Installation and commissioning of air-conditioning units.'),
    ('air-conditioning-refrigeration', 'aircon-repair', 'Aircon Repair', 'Diagnosis and repair of air-conditioning faults.'),
    ('air-conditioning-refrigeration', 'refrigerant-charging', 'Refrigerant Charging', 'Leak-aware refrigerant diagnosis and charging.'),
    ('air-conditioning-refrigeration', 'refrigerator-freezer-repair', 'Refrigerator & Freezer Repair', 'Diagnosis and repair of household refrigeration appliances.'),
    ('appliance-repair', 'washing-machine-repair', 'Washing Machine Repair', 'Diagnosis and repair of washing machines.'),
    ('appliance-repair', 'stove-oven-repair', 'Stove & Oven Repair', 'Diagnosis and repair of electric or gas cooking appliances.'),
    ('appliance-repair', 'water-heater-repair', 'Water Heater Repair', 'Diagnosis and repair of household water heaters.'),
    ('appliance-repair', 'electric-fan-repair', 'Electric Fan Repair', 'Diagnosis and repair of electric fans.'),
    ('appliance-repair', 'small-appliance-repair', 'Small Appliance Repair', 'Diagnosis and repair of supported small household appliances.'),
    ('landscaping-gardening', 'lawn-garden-maintenance', 'Lawn & Garden Maintenance', 'Routine lawn and garden care.'),
    ('landscaping-gardening', 'tree-shrub-trimming', 'Tree & Shrub Trimming', 'Pruning and trimming of manageable trees and shrubs.'),
    ('landscaping-gardening', 'garden-design-planting', 'Garden Design & Planting', 'Garden layout, soil preparation, and planting.'),
    ('landscaping-gardening', 'irrigation-installation-repair', 'Irrigation Installation & Repair', 'Installation and repair of garden irrigation systems.'),
    ('landscaping-gardening', 'yard-cleanup', 'Yard Cleanup', 'Removal of leaves, cuttings, and ordinary yard debris.'),
    ('roofing-waterproofing', 'roof-inspection-repair', 'Roof Inspection & Repair', 'Inspection and repair of damaged roofing components.'),
    ('roofing-waterproofing', 'roof-leak-repair', 'Roof Leak Repair', 'Identification and repair of roof water entry points.'),
    ('roofing-waterproofing', 'gutter-installation-cleaning', 'Gutter Installation & Cleaning', 'Installation, repair, and cleaning of roof gutters.'),
    ('roofing-waterproofing', 'waterproofing', 'Waterproofing', 'Application and repair of waterproofing systems.'),
    ('roofing-waterproofing', 'roof-installation-replacement', 'Roof Installation & Replacement', 'Installation or replacement of roof covering systems.')
)
insert into public.service_categories(name, slug, description, is_active, industry_id)
select catalog.skill_name, catalog.skill_slug, catalog.skill_description, true, industry.id
from catalog
join public.industries industry on industry.slug = catalog.industry_slug
on conflict (name) do update
set slug = excluded.slug,
    description = coalesce(public.service_categories.description, excluded.description),
    is_active = true,
    industry_id = excluded.industry_id,
    updated_at = now();

-- Infer a primary industry only when all existing skills resolve to one industry.
with unambiguous_worker_industries as (
  select skill.worker_id, min(category.industry_id::text)::uuid as industry_id
  from public.worker_skills skill
  join public.service_categories category on category.id = skill.category_id
  where category.industry_id is not null
  group by skill.worker_id
  having count(distinct category.industry_id) = 1
)
update public.worker_profiles profile
set primary_industry_id = inferred.industry_id,
    updated_at = now()
from unambiguous_worker_industries inferred
where profile.account_id = inferred.worker_id
  and profile.primary_industry_id is null;

-- Registration skills are written transactionally by the onboarding RPC. Direct
-- writes would bypass active-state and same-industry validation.
revoke insert, update, delete on public.worker_skills from authenticated;
drop policy if exists skills_owner_write on public.worker_skills;

create or replace function public.submit_worker_onboarding_identity(
  p_identity_data jsonb,
  p_document_paths text[]
) returns public.worker_verifications
language plpgsql security definer set search_path = '' as $$
declare
  result public.worker_verifications;
  selected_industry_id uuid;
  selected_skill_ids uuid[];
  birthday_date date;
  uuid_pattern constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';
begin
  if public.current_role() is distinct from 'WORKER'
    or jsonb_typeof(p_identity_data) is distinct from 'object'
    or length(btrim(coalesce(p_identity_data->>'firstName', ''))) not between 1 and 80
    or length(btrim(coalesce(p_identity_data->>'lastName', ''))) not between 1 and 80
    or coalesce(p_identity_data->>'phone', '') !~ '^(09|\+639)[0-9]{9}$'
    or coalesce(p_identity_data->>'birthday', '') !~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
    or coalesce(p_identity_data->>'gender', '') not in ('', 'male', 'female', 'other')
    or p_identity_data->>'employmentType' not in ('employed', 'freelance')
    or jsonb_typeof(p_identity_data->'address') is distinct from 'object'
    or length(btrim(coalesce(p_identity_data#>>'{address,street}', ''))) not between 1 and 120
    or length(btrim(coalesce(p_identity_data#>>'{address,city}', ''))) not between 2 and 120
    or length(btrim(coalesce(p_identity_data#>>'{address,province}', ''))) not between 2 and 120
    or length(btrim(coalesce(p_identity_data->>'contactPerson', ''))) not between 2 and 120
    or coalesce(p_identity_data->>'contactPhone', '') !~ '^(09|\+639)[0-9]{9}$'
    or coalesce(p_identity_data->>'idType', '') not in ('philsys','drivers_license','passport','umid','postal','prc','voters','senior','other')
    or jsonb_typeof(p_identity_data->'consents') is distinct from 'object'
    or p_identity_data->'consents'->'informationAccurate' is distinct from 'true'::jsonb
    or p_identity_data->'consents'->'privacy' is distinct from 'true'::jsonb
    or p_identity_data->'consents'->'terms' is distinct from 'true'::jsonb
    or coalesce(cardinality(p_document_paths), 0) <> 2
    or coalesce(p_identity_data->>'industryId', '') !~ uuid_pattern
    or jsonb_typeof(p_identity_data->'skillIds') is distinct from 'array'
    or jsonb_array_length(p_identity_data->'skillIds') not between 1 and 10
  then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_ONBOARDING';
  end if;

  begin
    birthday_date := to_date(p_identity_data->>'birthday', 'MM/DD/YYYY');
  exception when others then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_ONBOARDING';
  end;
  if to_char(birthday_date, 'MM/DD/YYYY') <> p_identity_data->>'birthday'
    or birthday_date > current_date then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_ONBOARDING';
  end if;

  if exists (
    select 1 from jsonb_array_elements_text(p_identity_data->'skillIds') item
    where item.value !~ uuid_pattern
  ) then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_SKILLS';
  end if;

  selected_industry_id := (p_identity_data->>'industryId')::uuid;
  select array_agg(distinct item.value::uuid)
  into selected_skill_ids
  from jsonb_array_elements_text(p_identity_data->'skillIds') item;

  if cardinality(selected_skill_ids) <> jsonb_array_length(p_identity_data->'skillIds')
    or not exists (
      select 1 from public.industries industry
      where industry.id = selected_industry_id and industry.is_active
    )
    or (
      select count(*) from public.service_categories category
      where category.id = any(selected_skill_ids)
        and category.industry_id = selected_industry_id
        and category.is_active
    ) <> cardinality(selected_skill_ids)
  then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_SKILLS';
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

  update public.worker_profiles
  set primary_industry_id = selected_industry_id,
      updated_at = now()
  where account_id = auth.uid();

  delete from public.worker_skills
  where worker_id = auth.uid()
    and category_id <> all(selected_skill_ids);

  insert into public.worker_skills(worker_id, category_id)
  select auth.uid(), skill_id from unnest(selected_skill_ids) skill_id
  on conflict(worker_id, category_id) do nothing;

  return result;
end $$;

revoke all on function public.submit_worker_onboarding_identity(jsonb, text[]) from public, anon;
grant execute on function public.submit_worker_onboarding_identity(jsonb, text[]) to authenticated;

create or replace function public.submit_worker_application(
  p_identity_data jsonb,
  p_document_paths text[],
  p_bio text,
  p_experience text
) returns public.worker_verifications
language plpgsql security definer set search_path = '' as $$
declare result public.worker_verifications;
begin
  if not exists (
    select 1 from public.accounts account
    where account.id = auth.uid()
      and account.role = 'WORKER'
      and account.status = 'ACTIVE'
      and account.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'WORKER_ROLE_REQUIRED';
  end if;

  update public.worker_profiles
  set bio = nullif(btrim(p_bio), ''),
      experience = nullif(btrim(p_experience), ''),
      updated_at = now()
  where account_id = auth.uid();
  if not found then
    raise exception using errcode = 'P0002', message = 'WORKER_PROFILE_NOT_FOUND';
  end if;

  result := public.submit_worker_onboarding_identity(p_identity_data, p_document_paths);

  update public.accounts
  set profile_completed_at = coalesce(profile_completed_at, now()),
      updated_at = now()
  where id = auth.uid();

  return result;
end $$;

revoke all on function public.submit_worker_application(jsonb, text[], text, text) from public, anon;
grant execute on function public.submit_worker_application(jsonb, text[], text, text) to authenticated;

commit;

-- ============================================================================
-- 23. Hosted industry taxonomy reconciliation
-- Source: supabase/migrations/20260722000600_reconcile_hosted_industry_taxonomy.sql
-- ============================================================================

-- Idempotent hosted-schema reconciliation for the industry and skill taxonomy.
-- Replays the complete contract because hosted migration 20260722000500 was recorded
-- before its pre-existing industries table had the required sort_order column.

begin;

create table if not exists public.industries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique check (length(btrim(name)) between 2 and 120),
  description text check (description is null or length(btrim(description)) between 2 and 1000),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The hosted authoritative schema already contains an earlier industries table
-- without display ordering. CREATE TABLE IF NOT EXISTS does not add columns.
alter table public.industries
  add column if not exists sort_order integer not null default 0 check (sort_order >= 0);

alter table public.service_categories
  add column if not exists industry_id uuid references public.industries(id) on delete restrict;

alter table public.worker_profiles
  add column if not exists primary_industry_id uuid references public.industries(id) on delete restrict;

create index if not exists industries_active_order_idx
  on public.industries(sort_order, name) where is_active;
create index if not exists service_categories_industry_active_name_idx
  on public.service_categories(industry_id, is_active, name);
create index if not exists worker_profiles_primary_industry_idx
  on public.worker_profiles(primary_industry_id) where primary_industry_id is not null;

drop trigger if exists set_updated_at on public.industries;
create trigger set_updated_at before update on public.industries
for each row execute function public.set_updated_at();

alter table public.industries enable row level security;

drop policy if exists industries_public_read on public.industries;
create policy industries_public_read on public.industries
for select to anon, authenticated
using (is_active or public.is_admin(false));

drop policy if exists industries_admin_write on public.industries;
create policy industries_admin_write on public.industries
for all to authenticated
using (public.is_admin(true))
with check (public.is_admin(true));

grant select on public.industries to anon, authenticated;
grant insert, update, delete on public.industries to authenticated;

insert into public.industries(slug, name, description, sort_order, is_active)
values
  ('cleaning', 'Cleaning', 'Residential and property cleaning services.', 10, true),
  ('electrical', 'Electrical', 'Electrical installation, maintenance, and repair services.', 20, true),
  ('plumbing', 'Plumbing', 'Plumbing installation, maintenance, and repair services.', 30, true),
  ('carpentry', 'Carpentry', 'Woodwork, furniture, fixture, and partition services.', 40, true),
  ('painting', 'Painting', 'Interior, exterior, and decorative painting services.', 50, true),
  ('masonry-tiling', 'Masonry & Tiling', 'Masonry, concrete, plastering, and tile services.', 60, true),
  ('air-conditioning-refrigeration', 'Air Conditioning & Refrigeration', 'Cooling and refrigeration installation, maintenance, and repair services.', 70, true),
  ('appliance-repair', 'Appliance Repair', 'Household and small-appliance diagnosis and repair services.', 80, true),
  ('landscaping-gardening', 'Landscaping & Gardening', 'Garden, lawn, planting, irrigation, and yard services.', 90, true),
  ('roofing-waterproofing', 'Roofing & Waterproofing', 'Roof, gutter, leak, and waterproofing services.', 100, true)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

with catalog(industry_slug, skill_slug, skill_name, skill_description) as (
  values
    ('cleaning', 'cleaning', 'Cleaning', 'General home and property cleaning.'),
    ('cleaning', 'deep-cleaning', 'Deep Cleaning', 'Detailed cleaning of high-use and hard-to-reach areas.'),
    ('cleaning', 'move-in-move-out-cleaning', 'Move-In/Move-Out Cleaning', 'Cleaning before occupancy or after vacating a property.'),
    ('cleaning', 'post-construction-cleaning', 'Post-Construction Cleaning', 'Removal of construction dust and debris after completed work.'),
    ('cleaning', 'carpet-upholstery-cleaning', 'Carpet & Upholstery Cleaning', 'Cleaning of carpets, rugs, and upholstered furniture.'),
    ('electrical', 'electrical', 'Electrical', 'General electrical diagnosis and repair.'),
    ('electrical', 'wiring-rewiring', 'Wiring & Rewiring', 'Installation or replacement of electrical wiring.'),
    ('electrical', 'lighting-installation', 'Lighting Installation', 'Installation and replacement of lighting fixtures.'),
    ('electrical', 'outlet-switch-installation', 'Outlet & Switch Installation', 'Installation and repair of outlets and switches.'),
    ('electrical', 'panel-circuit-breaker-service', 'Panel & Circuit Breaker Service', 'Inspection, repair, and replacement of panels and breakers.'),
    ('plumbing', 'plumbing', 'Plumbing', 'General plumbing diagnosis and repair.'),
    ('plumbing', 'leak-detection-repair', 'Leak Detection & Repair', 'Detection and repair of water leaks.'),
    ('plumbing', 'drain-unclogging', 'Drain Unclogging', 'Clearing blocked sinks, drains, and waste lines.'),
    ('plumbing', 'fixture-installation', 'Fixture Installation', 'Installation and replacement of plumbing fixtures.'),
    ('plumbing', 'pipe-installation-repair', 'Pipe Installation & Repair', 'Installation, replacement, and repair of water pipes.'),
    ('carpentry', 'furniture-repair', 'Furniture Repair', 'Repair and restoration of wooden furniture.'),
    ('carpentry', 'cabinet-installation-repair', 'Cabinet Installation & Repair', 'Installation, alignment, and repair of cabinets.'),
    ('carpentry', 'door-window-repair', 'Door & Window Repair', 'Repair and adjustment of wooden doors and windows.'),
    ('carpentry', 'custom-woodwork', 'Custom Woodwork', 'Made-to-measure wood fixtures and furnishings.'),
    ('carpentry', 'ceiling-partition-installation', 'Ceiling & Partition Installation', 'Installation and repair of ceilings and room partitions.'),
    ('painting', 'interior-painting', 'Interior Painting', 'Painting of indoor walls, ceilings, and fixtures.'),
    ('painting', 'exterior-painting', 'Exterior Painting', 'Weather-resistant painting of exterior surfaces.'),
    ('painting', 'repainting-touch-ups', 'Repainting & Touch-Ups', 'Refresh coats and localized paint repairs.'),
    ('painting', 'surface-preparation', 'Surface Preparation', 'Cleaning, sanding, patching, and priming before painting.'),
    ('painting', 'decorative-finishing', 'Decorative Finishing', 'Decorative paint effects and specialty finishes.'),
    ('masonry-tiling', 'tile-installation-repair', 'Tile Installation & Repair', 'Installation and replacement of wall and floor tiles.'),
    ('masonry-tiling', 'concrete-repair', 'Concrete Repair', 'Repair of damaged concrete surfaces and minor structures.'),
    ('masonry-tiling', 'wall-fence-construction', 'Wall & Fence Construction', 'Construction and repair of masonry walls and fences.'),
    ('masonry-tiling', 'plastering-rendering', 'Plastering & Rendering', 'Application and repair of plaster and cement render.'),
    ('masonry-tiling', 'minor-demolition', 'Minor Demolition', 'Controlled removal of small non-structural masonry work.'),
    ('air-conditioning-refrigeration', 'aircon-cleaning-maintenance', 'Aircon Cleaning & Maintenance', 'Routine cleaning and preventive maintenance of air conditioners.'),
    ('air-conditioning-refrigeration', 'aircon-installation', 'Aircon Installation', 'Installation and commissioning of air-conditioning units.'),
    ('air-conditioning-refrigeration', 'aircon-repair', 'Aircon Repair', 'Diagnosis and repair of air-conditioning faults.'),
    ('air-conditioning-refrigeration', 'refrigerant-charging', 'Refrigerant Charging', 'Leak-aware refrigerant diagnosis and charging.'),
    ('air-conditioning-refrigeration', 'refrigerator-freezer-repair', 'Refrigerator & Freezer Repair', 'Diagnosis and repair of household refrigeration appliances.'),
    ('appliance-repair', 'washing-machine-repair', 'Washing Machine Repair', 'Diagnosis and repair of washing machines.'),
    ('appliance-repair', 'stove-oven-repair', 'Stove & Oven Repair', 'Diagnosis and repair of electric or gas cooking appliances.'),
    ('appliance-repair', 'water-heater-repair', 'Water Heater Repair', 'Diagnosis and repair of household water heaters.'),
    ('appliance-repair', 'electric-fan-repair', 'Electric Fan Repair', 'Diagnosis and repair of electric fans.'),
    ('appliance-repair', 'small-appliance-repair', 'Small Appliance Repair', 'Diagnosis and repair of supported small household appliances.'),
    ('landscaping-gardening', 'lawn-garden-maintenance', 'Lawn & Garden Maintenance', 'Routine lawn and garden care.'),
    ('landscaping-gardening', 'tree-shrub-trimming', 'Tree & Shrub Trimming', 'Pruning and trimming of manageable trees and shrubs.'),
    ('landscaping-gardening', 'garden-design-planting', 'Garden Design & Planting', 'Garden layout, soil preparation, and planting.'),
    ('landscaping-gardening', 'irrigation-installation-repair', 'Irrigation Installation & Repair', 'Installation and repair of garden irrigation systems.'),
    ('landscaping-gardening', 'yard-cleanup', 'Yard Cleanup', 'Removal of leaves, cuttings, and ordinary yard debris.'),
    ('roofing-waterproofing', 'roof-inspection-repair', 'Roof Inspection & Repair', 'Inspection and repair of damaged roofing components.'),
    ('roofing-waterproofing', 'roof-leak-repair', 'Roof Leak Repair', 'Identification and repair of roof water entry points.'),
    ('roofing-waterproofing', 'gutter-installation-cleaning', 'Gutter Installation & Cleaning', 'Installation, repair, and cleaning of roof gutters.'),
    ('roofing-waterproofing', 'waterproofing', 'Waterproofing', 'Application and repair of waterproofing systems.'),
    ('roofing-waterproofing', 'roof-installation-replacement', 'Roof Installation & Replacement', 'Installation or replacement of roof covering systems.')
)
insert into public.service_categories(name, slug, description, is_active, industry_id)
select catalog.skill_name, catalog.skill_slug, catalog.skill_description, true, industry.id
from catalog
join public.industries industry on industry.slug = catalog.industry_slug
on conflict (name) do update
set slug = excluded.slug,
    description = coalesce(public.service_categories.description, excluded.description),
    is_active = true,
    industry_id = excluded.industry_id,
    updated_at = now();

-- Infer a primary industry only when all existing skills resolve to one industry.
with unambiguous_worker_industries as (
  select skill.worker_id, min(category.industry_id::text)::uuid as industry_id
  from public.worker_skills skill
  join public.service_categories category on category.id = skill.category_id
  where category.industry_id is not null
  group by skill.worker_id
  having count(distinct category.industry_id) = 1
)
update public.worker_profiles profile
set primary_industry_id = inferred.industry_id,
    updated_at = now()
from unambiguous_worker_industries inferred
where profile.account_id = inferred.worker_id
  and profile.primary_industry_id is null;

-- Registration skills are written transactionally by the onboarding RPC. Direct
-- writes would bypass active-state and same-industry validation.
revoke insert, update, delete on public.worker_skills from authenticated;
drop policy if exists skills_owner_write on public.worker_skills;

create or replace function public.submit_worker_onboarding_identity(
  p_identity_data jsonb,
  p_document_paths text[]
) returns public.worker_verifications
language plpgsql security definer set search_path = '' as $$
declare
  result public.worker_verifications;
  selected_industry_id uuid;
  selected_skill_ids uuid[];
  birthday_date date;
  uuid_pattern constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';
begin
  if public.current_role() is distinct from 'WORKER'
    or jsonb_typeof(p_identity_data) is distinct from 'object'
    or length(btrim(coalesce(p_identity_data->>'firstName', ''))) not between 1 and 80
    or length(btrim(coalesce(p_identity_data->>'lastName', ''))) not between 1 and 80
    or coalesce(p_identity_data->>'phone', '') !~ '^(09|\+639)[0-9]{9}$'
    or coalesce(p_identity_data->>'birthday', '') !~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
    or coalesce(p_identity_data->>'gender', '') not in ('', 'male', 'female', 'other')
    or p_identity_data->>'employmentType' not in ('employed', 'freelance')
    or jsonb_typeof(p_identity_data->'address') is distinct from 'object'
    or length(btrim(coalesce(p_identity_data#>>'{address,street}', ''))) not between 1 and 120
    or length(btrim(coalesce(p_identity_data#>>'{address,city}', ''))) not between 2 and 120
    or length(btrim(coalesce(p_identity_data#>>'{address,province}', ''))) not between 2 and 120
    or length(btrim(coalesce(p_identity_data->>'contactPerson', ''))) not between 2 and 120
    or coalesce(p_identity_data->>'contactPhone', '') !~ '^(09|\+639)[0-9]{9}$'
    or coalesce(p_identity_data->>'idType', '') not in ('philsys','drivers_license','passport','umid','postal','prc','voters','senior','other')
    or jsonb_typeof(p_identity_data->'consents') is distinct from 'object'
    or p_identity_data->'consents'->'informationAccurate' is distinct from 'true'::jsonb
    or p_identity_data->'consents'->'privacy' is distinct from 'true'::jsonb
    or p_identity_data->'consents'->'terms' is distinct from 'true'::jsonb
    or coalesce(cardinality(p_document_paths), 0) <> 2
    or coalesce(p_identity_data->>'industryId', '') !~ uuid_pattern
    or jsonb_typeof(p_identity_data->'skillIds') is distinct from 'array'
    or jsonb_array_length(p_identity_data->'skillIds') not between 1 and 10
  then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_ONBOARDING';
  end if;

  begin
    birthday_date := to_date(p_identity_data->>'birthday', 'MM/DD/YYYY');
  exception when others then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_ONBOARDING';
  end;
  if to_char(birthday_date, 'MM/DD/YYYY') <> p_identity_data->>'birthday'
    or birthday_date > current_date then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_ONBOARDING';
  end if;

  if exists (
    select 1 from jsonb_array_elements_text(p_identity_data->'skillIds') item
    where item.value !~ uuid_pattern
  ) then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_SKILLS';
  end if;

  selected_industry_id := (p_identity_data->>'industryId')::uuid;
  select array_agg(distinct item.value::uuid)
  into selected_skill_ids
  from jsonb_array_elements_text(p_identity_data->'skillIds') item;

  if cardinality(selected_skill_ids) <> jsonb_array_length(p_identity_data->'skillIds')
    or not exists (
      select 1 from public.industries industry
      where industry.id = selected_industry_id and industry.is_active
    )
    or (
      select count(*) from public.service_categories category
      where category.id = any(selected_skill_ids)
        and category.industry_id = selected_industry_id
        and category.is_active
    ) <> cardinality(selected_skill_ids)
  then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_SKILLS';
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

  update public.worker_profiles
  set primary_industry_id = selected_industry_id,
      updated_at = now()
  where account_id = auth.uid();

  delete from public.worker_skills
  where worker_id = auth.uid()
    and category_id <> all(selected_skill_ids);

  insert into public.worker_skills(worker_id, category_id)
  select auth.uid(), skill_id from unnest(selected_skill_ids) skill_id
  on conflict(worker_id, category_id) do nothing;

  return result;
end $$;

revoke all on function public.submit_worker_onboarding_identity(jsonb, text[]) from public, anon;
grant execute on function public.submit_worker_onboarding_identity(jsonb, text[]) to authenticated;

create or replace function public.submit_worker_application(
  p_identity_data jsonb,
  p_document_paths text[],
  p_bio text,
  p_experience text
) returns public.worker_verifications
language plpgsql security definer set search_path = '' as $$
declare result public.worker_verifications;
begin
  if not exists (
    select 1 from public.accounts account
    where account.id = auth.uid()
      and account.role = 'WORKER'
      and account.status = 'ACTIVE'
      and account.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'WORKER_ROLE_REQUIRED';
  end if;

  update public.worker_profiles
  set bio = nullif(btrim(p_bio), ''),
      experience = nullif(btrim(p_experience), ''),
      updated_at = now()
  where account_id = auth.uid();
  if not found then
    raise exception using errcode = 'P0002', message = 'WORKER_PROFILE_NOT_FOUND';
  end if;

  result := public.submit_worker_onboarding_identity(p_identity_data, p_document_paths);

  update public.accounts
  set profile_completed_at = coalesce(profile_completed_at, now()),
      updated_at = now()
  where id = auth.uid();

  return result;
end $$;

revoke all on function public.submit_worker_application(jsonb, text[], text, text) from public, anon;
grant execute on function public.submit_worker_application(jsonb, text[], text, text) to authenticated;

commit;


-- ============================================================================
-- 24. Development seed data
-- Source: supabase/seed.sql
-- ============================================================================

insert into public.content_pages (key, title, body, version, published_at)
values
  ('TERMS', 'Terms of Service', 'Local development terms. Replace before production.', 'local-1', now()),
  ('PRIVACY', 'Privacy Policy', 'Local development privacy policy. Replace before production.', 'local-1', now()),
  ('REFUND_POLICY', 'Refund Policy', 'Local development refund policy. Replace before production.', 'local-1', now()),
  ('HELP_CENTER', 'Help Center', 'Local development help content. Replace before production.', 'local-1', now())
on conflict (key) do update set title = excluded.title, body = excluded.body, version = excluded.version;

insert into public.service_categories (name, description)
values
  ('Plumbing', 'Plumbing repair and installation'),
  ('Electrical', 'Electrical repair and installation'),
  ('Cleaning', 'Home and property cleaning')
on conflict (name) do nothing;

commit;

-- ============================================================================
-- Installation verification (read-only)
-- ============================================================================

-- Required extensions and their schemas.
select extension_record.extname as extension_name,
       namespace_record.nspname as installed_schema,
       extension_record.extversion as version
from pg_extension extension_record
join pg_namespace namespace_record
  on namespace_record.oid = extension_record.extnamespace
where extension_record.extname in (
  'pgcrypto', 'pgmq', 'pg_cron', 'pg_net', 'supabase_vault', 'postgis'
)
order by extension_record.extname;

-- Every exposed A-YOS table and its RLS/forced-RLS state.
select table_record.relname as table_name,
       table_record.relrowsecurity as rls_enabled,
       table_record.relforcerowsecurity as rls_forced
from pg_class table_record
join pg_namespace namespace_record
  on namespace_record.oid = table_record.relnamespace
where namespace_record.nspname = 'public'
  and table_record.relkind = 'r'
order by table_record.relname;

-- Private application buckets.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in (
  'request-media', 'verification-documents', 'message-attachments',
  'review-media', 'profile-images', 'report-exports'
)
order by id;

-- Durable application queues.
select queue_name, is_partitioned, is_unlogged
from pgmq.meta
where queue_name in (
  'booking_timeouts', 'no_match_notifications',
  'scheduled_notifications', 'provider_work'
)
order by queue_name;

-- Scheduled queue consumer. It safely does nothing until the required Vault
-- values are configured.
select jobid, jobname, schedule, command, active
from cron.job
where jobname = 'ayos-queue-consumer';

-- Authoritative geography columns and GiST indexes.
select table_name, column_name, udt_name
from information_schema.columns
where table_schema = 'public'
  and udt_name = 'geography'
order by table_name, column_name;

select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexdef ilike '%using gist%'
order by tablename, indexname;

-- Development seed confirmation. Replace the placeholder content before
-- production use.
select key, title, published_at
from public.content_pages
order by key;

select name, is_active
from public.service_categories
order by name;

select industry.name, industry.sort_order, count(category.id) as active_skill_count
from public.industries industry
left join public.service_categories category
  on category.industry_id = industry.id and category.is_active
where industry.is_active
group by industry.id, industry.name, industry.sort_order
order by industry.sort_order, industry.name;
