create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.account_status as enum ('pending', 'active', 'suspended', 'disabled');
create type public.worker_verification_status as enum ('draft', 'pending', 'needs_documents', 'approved', 'rejected');
create type public.availability_status as enum ('online', 'offline', 'busy');
create type public.request_urgency as enum ('asap', 'this_week', 'open_bidding');
create type public.request_status as enum ('draft', 'searching', 'posted', 'scheduled', 'accepted', 'en_route', 'arrived', 'in_progress', 'pending_confirmation', 'completed', 'cancelled');
create type public.bid_status as enum ('active', 'accepted', 'rejected', 'withdrawn');
create type public.booking_status as enum ('hired', 'accepted', 'en_route', 'arrived', 'in_progress', 'pending_confirmation', 'completed', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'requires_action', 'processing', 'completed', 'failed', 'cancelled', 'partially_refunded', 'refunded');
create type public.review_status as enum ('published', 'hidden', 'flagged');
create type public.ticket_status as enum ('open', 'pending', 'escalated', 'resolved', 'closed');

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null,
  description text
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$'),
  description text
);

create table public.role_permissions (
  role_id uuid not null references public.roles on delete cascade,
  permission_id uuid not null references public.permissions on delete cascade,
  primary key (role_id, permission_id)
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  phone text,
  first_name text not null default '',
  middle_name text,
  last_name text not null default '',
  birthday date,
  gender text check (gender in ('male', 'female', 'other')),
  avatar_path text,
  locale text not null default 'en-PH',
  status public.account_status not null default 'active',
  phone_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index profiles_email_key on public.profiles (lower(email)) where deleted_at is null;
create unique index profiles_phone_key on public.profiles (phone) where phone is not null and deleted_at is null;

create table public.user_roles (
  user_id uuid not null references auth.users on delete cascade,
  role_id uuid not null references public.roles on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  ip_address inet,
  unique (user_id, type, version)
);

create table public.user_settings (
  user_id uuid not null references auth.users on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  label text,
  street_number text,
  street text not null,
  district text,
  city text not null,
  region text not null,
  postal_code text,
  country_code char(2) not null default 'PH',
  location extensions.geography(point, 4326),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index addresses_user_idx on public.addresses (user_id, is_default) where deleted_at is null;
create index addresses_location_gix on public.addresses using gist (location);
create unique index addresses_one_default_idx on public.addresses (user_id) where is_default and deleted_at is null;

create table public.industries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  is_active boolean not null default true
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  industry_id uuid not null references public.industries on delete restrict,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  unique (industry_id, code)
);

create table public.worker_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users on delete cascade,
  industry_id uuid not null references public.industries on delete restrict,
  employment_type text not null check (employment_type in ('employed', 'freelance')),
  bio text,
  years_experience integer not null default 0 check (years_experience between 0 and 80),
  hourly_rate integer check (hourly_rate >= 0),
  currency char(3) not null default 'PHP',
  verification_status public.worker_verification_status not null default 'draft',
  availability_status public.availability_status not null default 'offline',
  contact_person text,
  contact_phone text,
  base_location extensions.geography(point, 4326),
  service_radius_m integer not null default 10000 check (service_radius_m between 1000 and 100000),
  rating_average numeric(3,2) not null default 0 check (rating_average between 0 and 5),
  rating_count integer not null default 0,
  completed_jobs integer not null default 0,
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index worker_profiles_location_gix on public.worker_profiles using gist (base_location);
create index worker_profiles_discovery_idx on public.worker_profiles (verification_status, availability_status, rating_average desc) where deleted_at is null;

create table public.worker_skills (
  worker_id uuid not null references public.worker_profiles on delete cascade,
  skill_id uuid not null references public.skills on delete cascade,
  created_at timestamptz not null default now(),
  primary key (worker_id, skill_id)
);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  icon text,
  color text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories on delete restrict,
  slug text not null unique,
  name text not null,
  description text,
  base_price integer check (base_price >= 0),
  currency char(3) not null default 'PHP',
  duration_minutes integer check (duration_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (category_id, name)
);

create table public.worker_services (
  worker_id uuid not null references public.worker_profiles on delete cascade,
  service_id uuid not null references public.services on delete cascade,
  price integer check (price >= 0),
  primary key (worker_id, service_id)
);

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete restrict,
  bucket_id text not null,
  object_path text not null unique,
  purpose text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  checksum_sha256 text,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  attached_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index uploads_owner_purpose_idx on public.uploads (owner_id, purpose, created_at desc) where deleted_at is null;

create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references public.worker_profiles on delete cascade,
  user_id uuid references auth.users on delete cascade,
  upload_id uuid not null unique references public.uploads on delete restrict,
  type text not null,
  side text check (side in ('front', 'back')),
  status text not null default 'uploaded' check (status in ('missing', 'uploaded', 'verified', 'rejected')),
  reviewed_by uuid references auth.users on delete set null,
  reviewed_at timestamptz,
  remarks text,
  created_at timestamptz not null default now(),
  check ((worker_id is not null) <> (user_id is not null))
);

create table public.favorites (
  user_id uuid not null references auth.users on delete cascade,
  provider_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, provider_id),
  check (user_id <> provider_id)
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users on delete restrict,
  selected_worker_id uuid references auth.users on delete set null,
  category_id uuid not null references public.service_categories on delete restrict,
  service_id uuid references public.services on delete set null,
  address_id uuid references public.addresses on delete set null,
  description text not null check (char_length(description) between 10 and 5000),
  urgency public.request_urgency,
  status public.request_status not null default 'draft',
  budget_min integer check (budget_min >= 0),
  budget_max integer check (budget_max >= 0),
  currency char(3) not null default 'PHP',
  scheduled_at timestamptz,
  address_text text,
  location extensions.geography(point, 4326),
  radius_m integer not null default 10000 check (radius_m between 1000 and 100000),
  has_parts boolean,
  parts_description text,
  analysis jsonb,
  published_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (budget_min is null or budget_max is null or budget_min <= budget_max)
);

create index service_requests_customer_idx on public.service_requests (customer_id, status, created_at desc) where deleted_at is null;
create index service_requests_market_idx on public.service_requests (category_id, urgency, status, created_at desc) where deleted_at is null;
create index service_requests_location_gix on public.service_requests using gist (location);

create table public.request_attachments (
  request_id uuid not null references public.service_requests on delete cascade,
  upload_id uuid not null unique references public.uploads on delete restrict,
  type text not null check (type in ('photo', 'audio', 'document')),
  primary key (request_id, upload_id)
);

create table public.request_matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests on delete cascade,
  worker_id uuid not null references public.worker_profiles on delete cascade,
  score numeric(5,2) not null check (score between 0 and 100),
  distance_m integer,
  reasons jsonb,
  created_at timestamptz not null default now(),
  unique (request_id, worker_id)
);

create table public.job_bids (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests on delete cascade,
  worker_id uuid not null references auth.users on delete restrict,
  message text not null check (char_length(message) between 1 and 2000),
  min_amount integer not null check (min_amount >= 0),
  max_amount integer not null check (max_amount >= min_amount),
  currency char(3) not null default 'PHP',
  status public.bid_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, worker_id)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique references public.service_requests on delete set null,
  customer_id uuid not null references auth.users on delete restrict,
  worker_id uuid not null references auth.users on delete restrict,
  service_id uuid references public.services on delete set null,
  status public.booking_status not null default 'hired',
  scheduled_at timestamptz,
  address_text text not null,
  location extensions.geography(point, 4326),
  notes text,
  has_parts boolean,
  parts_description text,
  amount integer not null check (amount >= 0),
  platform_fee integer not null default 0 check (platform_fee >= 0),
  currency char(3) not null default 'PHP',
  accepted_at timestamptz,
  en_route_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  worker_completed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (customer_id <> worker_id)
);

create index bookings_customer_idx on public.bookings (customer_id, status, scheduled_at);
create index bookings_worker_idx on public.bookings (worker_id, status, scheduled_at);
create index bookings_location_gix on public.bookings using gist (location);

create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings on delete cascade,
  actor_id uuid references auth.users on delete set null,
  from_status public.booking_status,
  to_status public.booking_status not null,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table public.booking_cancellations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings on delete restrict,
  actor_id uuid not null references auth.users on delete restrict,
  stage text not null check (stage in ('before_traveling', 'after_arriving', 'after_inspecting')),
  reason_id text not null,
  custom_reason text,
  notes text,
  fee_amount integer not null default 0,
  refund_amount integer not null default 0,
  currency char(3) not null default 'PHP',
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.service_requests on delete set null,
  booking_id uuid references public.bookings on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (request_id is not null or booking_id is not null)
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id uuid not null references auth.users on delete restrict,
  text text check (char_length(text) between 1 and 5000),
  attachment_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  check (text is not null or cardinality(attachment_paths) > 0)
);

create index messages_conversation_idx on public.messages (conversation_id, created_at desc) where deleted_at is null;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings on delete restrict,
  customer_id uuid not null references auth.users on delete restrict,
  provider text not null,
  provider_payment_id text unique,
  idempotency_key text not null unique,
  method text not null,
  amount integer not null check (amount > 0),
  currency char(3) not null default 'PHP',
  status public.payment_status not null default 'pending',
  reference text not null unique,
  failure_code text,
  failure_message text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments on delete restrict,
  requested_by uuid not null references auth.users on delete restrict,
  provider_refund_id text unique,
  amount integer not null check (amount > 0),
  currency char(3) not null default 'PHP',
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null unique references public.worker_profiles on delete restrict,
  balance integer not null default 0 check (balance >= 0),
  currency char(3) not null default 'PHP',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets on delete restrict,
  payment_id uuid references public.payments on delete restrict,
  type text not null check (type in ('job_earning', 'commission', 'payout', 'top_up', 'refund', 'adjustment')),
  direction text not null check (direction in ('credit', 'debit')),
  amount integer not null check (amount > 0),
  currency char(3) not null default 'PHP',
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'reversed')),
  description text not null,
  external_ref text unique,
  metadata jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.payout_methods (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles on delete restrict,
  type text not null,
  provider text not null,
  provider_token text not null,
  label text not null,
  account_mask text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (provider, provider_token)
);

create unique index payout_methods_default_idx on public.payout_methods (worker_id) where is_default and deleted_at is null;

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles on delete restrict,
  payout_method_id uuid not null references public.payout_methods on delete restrict,
  idempotency_key text not null unique,
  provider_payout_id text unique,
  amount integer not null check (amount > 0),
  currency char(3) not null default 'PHP',
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  failure_message text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings on delete restrict,
  author_id uuid not null references auth.users on delete restrict,
  subject_id uuid not null references auth.users on delete restrict,
  rating integer not null check (rating between 1 and 5),
  comment text,
  recommend boolean not null default true,
  status public.review_status not null default 'published',
  photo_paths text[] not null default '{}',
  helpful_count integer not null default 0,
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (booking_id, author_id),
  check (author_id <> subject_id)
);

create table public.review_votes (
  review_id uuid not null references public.reviews on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  helpful boolean not null,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  reason text not null,
  details text,
  created_at timestamptz not null default now(),
  unique (review_id, user_id)
);

create table public.review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews on delete cascade,
  author_id uuid not null references auth.users on delete restrict,
  message text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users on delete cascade,
  type text not null,
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'sms', 'push')),
  title text not null,
  message text not null,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index notifications_recipient_idx on public.notifications (recipient_id, read_at, created_at desc) where deleted_at is null;

create table public.notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users on delete restrict,
  title text not null,
  audience text not null check (audience in ('all_users', 'workers_only', 'customers_only', 'inactive_users')),
  channel text not null check (channel in ('in_app', 'email', 'sms', 'push')),
  message text not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  reporter_id uuid not null references auth.users on delete restrict,
  assignee_id uuid references auth.users on delete set null,
  booking_id uuid references public.bookings on delete set null,
  subject text not null,
  category text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status public.ticket_status not null default 'open',
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets on delete cascade,
  author_id uuid not null references auth.users on delete restrict,
  message text not null,
  attachment_paths text[] not null default '{}',
  internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  schema_version integer not null default 1,
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users on delete restrict,
  type text not null,
  format text not null check (format in ('json', 'csv')),
  period_start timestamptz,
  period_end timestamptz,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  output_path text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users on delete set null,
  request_id text,
  action text not null,
  module text not null,
  target_type text,
  target_id text,
  outcome text not null default 'success' check (outcome in ('success', 'failure', 'denied')),
  ip_address inet,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_module_idx on public.audit_logs (module, created_at desc);

create table public.deletion_records (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  display_name text not null,
  deleted_by uuid not null references auth.users on delete restrict,
  deleted_at timestamptz not null default now(),
  purge_after timestamptz not null default (now() + interval '30 days'),
  restored_at timestamptz,
  purged_at timestamptz,
  unique (entity_type, entity_id)
);
