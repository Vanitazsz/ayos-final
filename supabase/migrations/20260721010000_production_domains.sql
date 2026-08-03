-- Additive production domains. Existing hosted tables, IDs, and records are preserved.

alter table public.service_categories add column if not exists slug text;
alter table public.service_categories add column if not exists minimum_price_minor bigint;
alter table public.service_categories add column if not exists maximum_price_minor bigint;
alter table public.service_categories add column if not exists is_safety_critical boolean not null default false;
create unique index if not exists service_categories_slug_key on public.service_categories(slug) where slug is not null;
alter table public.service_categories add constraint service_categories_price_bounds
  check (minimum_price_minor is null or maximum_price_minor is null or (minimum_price_minor >= 0 and maximum_price_minor >= minimum_price_minor));

alter table public.addresses add column if not exists geocoding_provider text;
alter table public.addresses add column if not exists geocoding_provider_id text;
alter table public.addresses add column if not exists geocoding_confidence numeric(5,4);
alter table public.addresses add column if not exists geocoding_payload jsonb;
alter table public.addresses add constraint addresses_geocoding_confidence_check
  check (geocoding_confidence is null or geocoding_confidence between 0 and 1);

create table public.industries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique check (length(name) between 2 and 120),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  industry_id uuid not null references public.industries(id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(name) between 2 and 120),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(industry_id, slug)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete restrict,
  industry_id uuid references public.industries(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(name) between 2 and 160),
  description text,
  minimum_price_minor bigint not null default 0 check (minimum_price_minor >= 0),
  maximum_price_minor bigint check (maximum_price_minor is null or maximum_price_minor >= minimum_price_minor),
  estimated_duration_minutes integer check (estimated_duration_minutes between 5 and 10080),
  is_safety_critical boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_category_active_idx on public.services(category_id, is_active);

create table public.worker_offerings (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(account_id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  price_minor bigint check (price_minor is null or price_minor >= 0),
  description text check (description is null or length(description) <= 2000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(worker_id, service_id)
);
create index worker_offerings_service_active_idx on public.worker_offerings(service_id, is_active);

create table public.request_bids (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(account_id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  message text check (message is null or length(message) <= 2000),
  estimated_duration_minutes integer check (estimated_duration_minutes between 5 and 10080),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','WITHDRAWN','ACCEPTED','REJECTED','EXPIRED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index request_bids_one_active_per_worker on public.request_bids(service_request_id, worker_id) where status = 'ACTIVE';
create index request_bids_request_status_idx on public.request_bids(service_request_id, status, created_at desc);

create table public.wallets (
  account_id uuid primary key references public.accounts(id) on delete restrict,
  currency text not null default 'PHP' check (currency = 'PHP'),
  available_minor bigint not null default 0 check (available_minor >= 0),
  locked_minor bigint not null default 0 check (locked_minor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_account_id uuid not null references public.wallets(account_id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete restrict,
  payout_request_id uuid,
  transaction_type text not null check (transaction_type in ('BOOKING_EARNING','PAYOUT_HOLD','PAYOUT_RELEASE','PAYOUT_COMPLETED','ADJUSTMENT')),
  amount_minor bigint not null check (amount_minor <> 0),
  balance_after_minor bigint not null check (balance_after_minor >= 0),
  idempotency_key text not null unique check (length(idempotency_key) between 16 and 160),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index wallet_transactions_account_created_idx on public.wallet_transactions(wallet_account_id, created_at desc);

create table public.payout_methods (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  method_type text not null check (method_type in ('BANK','GCASH','MAYA')),
  label text not null check (length(label) between 2 and 120),
  details_encrypted text not null,
  last_four text check (last_four is null or last_four ~ '^[0-9]{4}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index payout_methods_one_default on public.payout_methods(account_id) where is_default;

create table public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  payout_method_id uuid not null references public.payout_methods(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','PROCESSING','PAID','REJECTED','CANCELLED')),
  idempotency_key text not null unique check (length(idempotency_key) between 16 and 160),
  reviewed_by uuid references public.accounts(id) on delete restrict,
  reviewed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.wallet_transactions add constraint wallet_transactions_payout_request_id_fkey
  foreign key (payout_request_id) references public.payout_requests(id) on delete restrict;
create index payout_requests_account_status_idx on public.payout_requests(account_id, status, created_at desc);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references public.accounts(id) on delete restrict,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index support_messages_ticket_created_idx on public.support_messages(ticket_id, created_at);

create table public.support_attachments (
  id uuid primary key default gen_random_uuid(),
  support_message_id uuid not null references public.support_messages(id) on delete cascade,
  storage_path text not null,
  content_type text not null,
  byte_size integer not null check (byte_size between 1 and 15728640),
  created_at timestamptz not null default now()
);

create table public.review_votes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  helpful boolean not null,
  created_at timestamptz not null default now(),
  primary key(review_id, account_id)
);

create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  reporter_id uuid not null references public.accounts(id) on delete restrict,
  reason text not null check (length(reason) between 3 and 1000),
  status text not null default 'OPEN' check (status in ('OPEN','DISMISSED','ACTIONED')),
  resolved_by uuid references public.accounts(id) on delete restrict,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(review_id, reporter_id)
);

create table public.review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  author_id uuid not null references public.accounts(id) on delete restrict,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_ai_insights (
  review_id uuid primary key references public.reviews(id) on delete cascade,
  sentiment text not null check (sentiment in ('POSITIVE','NEUTRAL','NEGATIVE','MIXED')),
  topics text[] not null default '{}',
  risk_flags text[] not null default '{}',
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  provider text not null,
  model text not null,
  provider_reference text,
  created_at timestamptz not null default now()
);

create table public.notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 160),
  body text not null check (length(body) between 1 and 4000),
  audience public.notification_audience not null,
  status public.notification_status not null default 'DRAFT',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid not null references public.accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.notification_campaigns(id) on delete cascade,
  recipient_id uuid not null references public.accounts(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete set null,
  channel text not null default 'IN_APP' check (channel = 'IN_APP'),
  status text not null default 'PENDING' check (status in ('PENDING','DELIVERED','READ','FAILED')),
  delivered_at timestamptz,
  read_at timestamptz,
  error_code text,
  unique(campaign_id, recipient_id, channel)
);

create table public.cancellation_reasons (
  code text primary key check (code ~ '^[A-Z0-9_]+$'),
  label text not null,
  applies_to text not null check (applies_to in ('USER','WORKER','BOTH')),
  sort_order integer not null default 0,
  is_active boolean not null default true
);

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

alter table public.ai_analysis_attempts add column if not exists job_id uuid references public.ai_analysis_jobs(id) on delete set null;
alter table public.ai_analysis_attempts add column if not exists correlation_id text;
alter table public.ai_analysis_attempts add column if not exists usage_metadata jsonb not null default '{}';
alter table public.ai_analysis_attempts add column if not exists http_status integer;

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

-- Safe OAuth provisioning: missing/Google role metadata becomes USER; metadata can never grant ADMIN.
create or replace function public.provision_account() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  requested_role public.account_role;
  display_name text;
  mobile_value text;
  bootstrap_token text;
  bootstrap_request private.admin_bootstrap_requests;
  requested_role_text text;
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
    requested_role_text := upper(nullif(btrim(coalesce(new.raw_user_meta_data->>'role', '')), ''));
    if requested_role_text is null then requested_role := 'USER';
    elsif requested_role_text in ('USER','WORKER') then requested_role := requested_role_text::public.account_role;
    else raise exception using errcode='42501', message='Invalid account role'; end if;
    display_name := btrim(coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  end if;
  mobile_value := nullif(btrim(coalesce(new.raw_user_meta_data->>'mobile', '')), '');
  if length(display_name) < 2 then display_name := 'A-yos User'; end if;
  insert into public.accounts(id, role, status, email, mobile, is_protected)
  values(new.id, requested_role,
    case when requested_role='ADMIN' or new.email_confirmed_at is not null then 'ACTIVE'::public.account_status else 'PENDING_VERIFICATION'::public.account_status end,
    lower(new.email), mobile_value, requested_role='ADMIN');
  if requested_role='USER' then insert into public.user_profiles(account_id,display_name) values(new.id,display_name);
  elsif requested_role='WORKER' then insert into public.worker_profiles(account_id,display_name) values(new.id,display_name);
  else insert into public.admin_profiles(account_id,display_name) values(new.id,display_name); end if;
  return new;
end $$;
revoke all on function public.provision_account() from public, anon;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.provision_account();

create or replace function public.submit_worker_application(p_identity_data jsonb, p_document_paths text[], p_bio text, p_experience text)
returns public.worker_verifications language plpgsql security definer set search_path='' as $$
declare result public.worker_verifications;
begin
  if public.current_role() <> 'WORKER' then raise exception using errcode='42501',message='WORKER_ROLE_REQUIRED'; end if;
  if coalesce(array_length(p_document_paths,1),0) < 1 then raise exception using errcode='22023',message='DOCUMENT_REQUIRED'; end if;
  if exists(select 1 from unnest(p_document_paths) p where split_part(p,'/',1) <> auth.uid()::text) then
    raise exception using errcode='42501',message='INVALID_STORAGE_PATH';
  end if;
  update public.worker_profiles set bio=nullif(btrim(p_bio),''),experience=nullif(btrim(p_experience),'') where account_id=auth.uid();
  insert into public.worker_verifications(worker_id,identity_data,document_paths,status)
  values(auth.uid(),coalesce(p_identity_data,'{}'),p_document_paths,'PENDING') returning * into result;
  return result;
end $$;

create or replace function public.submit_request_bid(p_service_request_id uuid,p_amount_minor bigint,p_message text,p_duration_minutes integer)
returns public.request_bids language plpgsql security definer set search_path='' as $$
declare result public.request_bids;
begin
  if public.current_role()<>'WORKER' or not exists(select 1 from public.worker_profiles where account_id=auth.uid() and approval_status='APPROVED') then
    raise exception using errcode='42501',message='APPROVED_WORKER_REQUIRED'; end if;
  if p_amount_minor<=0 or p_duration_minutes not between 5 and 10080 then raise exception using errcode='22023',message='INVALID_BID'; end if;
  if not exists(select 1 from public.service_requests r join public.worker_skills s on s.category_id=r.category_id and s.worker_id=auth.uid() where r.id=p_service_request_id and r.status in ('OPEN','MATCHED')) then
    raise exception using errcode='42501',message='REQUEST_NOT_AVAILABLE'; end if;
  insert into public.request_bids(service_request_id,worker_id,amount_minor,message,estimated_duration_minutes)
  values(p_service_request_id,auth.uid(),p_amount_minor,nullif(btrim(p_message),''),p_duration_minutes) returning * into result;
  return result;
end $$;

create or replace function public.withdraw_request_bid(p_bid_id uuid) returns public.request_bids
language plpgsql security definer set search_path='' as $$
declare result public.request_bids;
begin
  update public.request_bids set status='WITHDRAWN',updated_at=now() where id=p_bid_id and worker_id=auth.uid() and status='ACTIVE' returning * into result;
  if result.id is null then raise exception using errcode='42501',message='BID_NOT_WITHDRAWABLE'; end if; return result;
end $$;

create or replace function public.mark_notification_read(p_notification_id uuid) returns public.notifications
language plpgsql security definer set search_path='' as $$
declare result public.notifications;
begin
  update public.notifications set read_at=coalesce(read_at,now()) where id=p_notification_id and recipient_id=auth.uid() returning * into result;
  if result.id is null then raise exception using errcode='42501',message='NOTIFICATION_UNAVAILABLE'; end if; return result;
end $$;

create or replace function public.request_payout(p_method_id uuid,p_amount_minor bigint,p_idempotency_key text)
returns public.payout_requests language plpgsql security definer set search_path='' as $$
declare wallet public.wallets; result public.payout_requests;
begin
  if length(p_idempotency_key) not between 16 and 160 or p_amount_minor<=0 then raise exception using errcode='22023',message='INVALID_PAYOUT'; end if;
  if not exists(select 1 from public.payout_methods where id=p_method_id and account_id=auth.uid()) then raise exception using errcode='42501',message='PAYOUT_METHOD_UNAVAILABLE'; end if;
  insert into public.wallets(account_id) values(auth.uid()) on conflict do nothing;
  select * into wallet from public.wallets where account_id=auth.uid() for update;
  if wallet.available_minor<p_amount_minor then raise exception using errcode='22023',message='INSUFFICIENT_BALANCE'; end if;
  insert into public.payout_requests(account_id,payout_method_id,amount_minor,idempotency_key)
  values(auth.uid(),p_method_id,p_amount_minor,p_idempotency_key) returning * into result;
  update public.wallets set available_minor=available_minor-p_amount_minor,locked_minor=locked_minor+p_amount_minor,updated_at=now() where account_id=auth.uid();
  insert into public.wallet_transactions(wallet_account_id,payout_request_id,transaction_type,amount_minor,balance_after_minor,idempotency_key)
  values(auth.uid(),result.id,'PAYOUT_HOLD',-p_amount_minor,wallet.available_minor-p_amount_minor,p_idempotency_key||':hold');
  return result;
end $$;

create or replace function public.admin_decide_payout(p_payout_id uuid,p_status text,p_reason text default null)
returns public.payout_requests language plpgsql security definer set search_path='' as $$
declare result public.payout_requests; wallet public.wallets;
begin
  if not public.is_admin(true) or p_status not in ('APPROVED','REJECTED') then raise exception using errcode='42501',message='AAL2_ADMIN_REQUIRED'; end if;
  select * into result from public.payout_requests where id=p_payout_id and status='PENDING' for update;
  if result.id is null then raise exception using errcode='P0002',message='PAYOUT_NOT_PENDING'; end if;
  select * into wallet from public.wallets where account_id=result.account_id for update;
  if p_status='REJECTED' then
    update public.wallets set available_minor=available_minor+result.amount_minor,locked_minor=locked_minor-result.amount_minor,updated_at=now() where account_id=result.account_id;
    insert into public.wallet_transactions(wallet_account_id,payout_request_id,transaction_type,amount_minor,balance_after_minor,idempotency_key)
    values(result.account_id,result.id,'PAYOUT_RELEASE',result.amount_minor,wallet.available_minor+result.amount_minor,result.id::text||':release');
  end if;
  update public.payout_requests set status=p_status,failure_reason=case when p_status='REJECTED' then p_reason end,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=result.id returning * into result;
  return result;
end $$;

create or replace function public.admin_dashboard_metrics() returns jsonb
language sql security definer set search_path='' stable as $$
  select case when public.is_admin(false) then jsonb_build_object(
    'accounts', (select count(*) from public.accounts where deleted_at is null),
    'active_workers', (select count(*) from public.worker_profiles where approval_status='APPROVED'),
    'open_requests', (select count(*) from public.service_requests where status in ('OPEN','MATCHED')),
    'active_bookings', (select count(*) from public.bookings where status not in ('COMPLETED','CANCELLED')),
    'successful_payment_total', (select coalesce(sum(service_amount),0) from public.payments where status='SUCCESSFUL'),
    'pending_verifications', (select count(*) from public.worker_verifications where status='PENDING'),
    'open_support', (select count(*) from public.support_tickets where status not in ('RESOLVED','CLOSED')),
    'queued_ai_jobs', (select count(*) from public.ai_analysis_jobs where status in ('QUEUED','PROCESSING'))
  ) else null end
$$;

create or replace function public.save_geocoded_address(
  p_label text,p_line1 text,p_line2 text,p_barangay text,p_city text,p_province text,p_postal_code text,
  p_latitude numeric,p_longitude numeric,p_provider_id text,p_confidence numeric,p_payload jsonb,p_is_default boolean default false
) returns public.addresses language plpgsql security definer set search_path='' as $$
declare result public.addresses;
begin
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception using errcode='22023',message='INVALID_COORDINATES'; end if;
  if p_latitude not between 4.0 and 22.0 or p_longitude not between 116.0 and 127.0 then raise exception using errcode='22023',message='OUTSIDE_PHILIPPINES'; end if;
  if p_is_default then update public.addresses set is_default=false where account_id=auth.uid(); end if;
  insert into public.addresses(account_id,label,line1,line2,barangay,city,province,postal_code,is_default,location,geocoding_provider,geocoding_provider_id,geocoding_confidence,geocoding_payload)
  values(auth.uid(),btrim(p_label),btrim(p_line1),nullif(btrim(p_line2),''),coalesce(nullif(btrim(p_barangay),''),'Not provided'),coalesce(nullif(btrim(p_city),''),'Not provided'),coalesce(nullif(btrim(p_province),''),'Not provided'),nullif(btrim(p_postal_code),''),p_is_default,
    private.make_location(p_latitude,p_longitude),'OPENROUTESERVICE',p_provider_id,p_confidence,coalesce(p_payload,'{}')) returning * into result;
  return result;
end $$;

create or replace function public.prevent_wallet_transaction_mutation() returns trigger language plpgsql set search_path='' as $$
begin raise exception using errcode='42501',message='WALLET_TRANSACTIONS_ARE_APPEND_ONLY'; end $$;
create trigger wallet_transactions_append_only before update or delete on public.wallet_transactions for each row execute function public.prevent_wallet_transaction_mutation();

create or replace function public.credit_worker_wallet() returns trigger language plpgsql security definer set search_path='' as $$
declare worker_id uuid; amount_minor bigint; current_balance bigint;
begin
  if new.status='SUCCESSFUL' and old.status is distinct from 'SUCCESSFUL' then
    select b.worker_account_id into worker_id from public.bookings b where b.id=new.booking_id;
    amount_minor := round(new.worker_net_amount*100)::bigint;
    insert into public.wallets(account_id) values(worker_id) on conflict do nothing;
    update public.wallets set available_minor=available_minor+amount_minor,updated_at=now() where account_id=worker_id returning available_minor into current_balance;
    insert into public.wallet_transactions(wallet_account_id,booking_id,transaction_type,amount_minor,balance_after_minor,idempotency_key)
    values(worker_id,new.booking_id,'BOOKING_EARNING',amount_minor,current_balance,'payment:'||new.id::text||':worker-earning') on conflict(idempotency_key) do nothing;
  end if; return new;
end $$;
create trigger credit_worker_wallet_after_payment after update of status on public.payments for each row execute function public.credit_worker_wallet();

-- RLS and grants.
alter table public.industries enable row level security;
alter table public.skills enable row level security;
alter table public.services enable row level security;
alter table public.worker_offerings enable row level security;
alter table public.request_bids enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.payout_methods enable row level security;
alter table public.payout_requests enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_attachments enable row level security;
alter table public.review_votes enable row level security;
alter table public.review_reports enable row level security;
alter table public.review_replies enable row level security;
alter table public.review_ai_insights enable row level security;
alter table public.notification_campaigns enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.cancellation_reasons enable row level security;
alter table public.ai_processing_consents enable row level security;
alter table public.ai_analysis_jobs enable row level security;
alter table public.geocoding_cache enable row level security;
alter table public.route_snapshots enable row level security;

create policy taxonomy_read on public.industries for select to anon,authenticated using(is_active or public.is_admin(false));
create policy skills_read on public.skills for select to anon,authenticated using(is_active or public.is_admin(false));
create policy services_read on public.services for select to anon,authenticated using(is_active or public.is_admin(false));
create policy offerings_read on public.worker_offerings for select to authenticated using(is_active or worker_id=auth.uid() or public.is_admin(false));
create policy offerings_owner_all on public.worker_offerings for all to authenticated using(worker_id=auth.uid()) with check(worker_id=auth.uid());
create policy bids_participants_read on public.request_bids for select to authenticated using(worker_id=auth.uid() or exists(select 1 from public.service_requests r where r.id=service_request_id and r.user_account_id=auth.uid()) or public.is_admin(false));
create policy wallets_owner_read on public.wallets for select to authenticated using(account_id=auth.uid() or public.is_admin(false));
create policy wallet_transactions_owner_read on public.wallet_transactions for select to authenticated using(wallet_account_id=auth.uid() or public.is_admin(false));
create policy payout_methods_owner_all on public.payout_methods for all to authenticated using(account_id=auth.uid()) with check(account_id=auth.uid());
create policy payout_requests_owner_read on public.payout_requests for select to authenticated using(account_id=auth.uid() or public.is_admin(false));
create policy support_messages_participant_read on public.support_messages for select to authenticated using(sender_id=auth.uid() or exists(select 1 from public.support_tickets t where t.id=ticket_id and t.owner_id=auth.uid()) or public.is_admin(false));
create policy support_messages_participant_insert on public.support_messages for insert to authenticated with check(sender_id=auth.uid() and (exists(select 1 from public.support_tickets t where t.id=ticket_id and t.owner_id=auth.uid()) or public.is_admin(false)));
create policy support_attachments_participant_read on public.support_attachments for select to authenticated using(exists(select 1 from public.support_messages m join public.support_tickets t on t.id=m.ticket_id where m.id=support_message_id and (t.owner_id=auth.uid() or public.is_admin(false))));
create policy support_attachments_owner_insert on public.support_attachments for insert to authenticated with check(exists(select 1 from public.support_messages m where m.id=support_message_id and m.sender_id=auth.uid()) and split_part(storage_path,'/',1)=auth.uid()::text);
create policy review_votes_read on public.review_votes for select to authenticated using(true);
create policy review_votes_owner_all on public.review_votes for all to authenticated using(account_id=auth.uid()) with check(account_id=auth.uid());
create policy review_reports_owner_insert on public.review_reports for insert to authenticated with check(reporter_id=auth.uid());
create policy review_reports_owner_admin_read on public.review_reports for select to authenticated using(reporter_id=auth.uid() or public.is_admin(false));
create policy review_replies_read on public.review_replies for select to authenticated using(true);
create policy review_replies_owner_all on public.review_replies for all to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
create policy review_insights_admin_read on public.review_ai_insights for select to authenticated using(public.is_admin(false));
create policy campaigns_admin_all on public.notification_campaigns for all to authenticated using(public.is_admin(false)) with check(public.is_admin(false));
create policy deliveries_owner_admin_read on public.notification_deliveries for select to authenticated using(recipient_id=auth.uid() or public.is_admin(false));
create policy cancellation_reasons_read on public.cancellation_reasons for select to anon,authenticated using(is_active or public.is_admin(false));
create policy ai_consents_owner_read on public.ai_processing_consents for select to authenticated using(account_id=auth.uid() or public.is_admin(false));
create policy ai_consents_owner_insert on public.ai_processing_consents for insert to authenticated with check(account_id=auth.uid());
create policy ai_jobs_owner_read on public.ai_analysis_jobs for select to authenticated using(account_id=auth.uid() or public.is_admin(false));
create policy route_snapshots_booking_parties on public.route_snapshots for select to authenticated using(public.is_booking_party(booking_id) or public.is_admin(false));

grant select on public.industries,public.skills,public.services,public.cancellation_reasons to anon,authenticated;
grant select,insert,update,delete on public.worker_offerings,public.payout_methods,public.review_votes,public.review_replies to authenticated;
grant select on public.request_bids,public.wallets,public.wallet_transactions,public.payout_requests,public.support_messages,public.support_attachments,public.review_reports,public.review_ai_insights,public.notification_campaigns,public.notification_deliveries,public.ai_processing_consents,public.ai_analysis_jobs,public.route_snapshots to authenticated;
grant insert on public.support_messages,public.support_attachments,public.review_reports,public.ai_processing_consents to authenticated;
grant select,insert,update,delete on all tables in schema public to service_role;

revoke all on function public.submit_worker_application(jsonb,text[],text,text),public.submit_request_bid(uuid,bigint,text,integer),public.withdraw_request_bid(uuid),public.mark_notification_read(uuid),public.request_payout(uuid,bigint,text),public.admin_decide_payout(uuid,text,text),public.admin_dashboard_metrics(),public.save_geocoded_address(text,text,text,text,text,text,text,numeric,numeric,text,numeric,jsonb,boolean) from public,anon;
grant execute on function public.submit_worker_application(jsonb,text[],text,text),public.submit_request_bid(uuid,bigint,text,integer),public.withdraw_request_bid(uuid),public.mark_notification_read(uuid),public.request_payout(uuid,bigint,text),public.admin_decide_payout(uuid,text,text),public.admin_dashboard_metrics(),public.save_geocoded_address(text,text,text,text,text,text,text,numeric,numeric,text,numeric,jsonb,boolean) to authenticated;

alter publication supabase_realtime add table public.ai_analysis_jobs,public.request_bids,public.wallets,public.payout_requests,public.support_messages,public.notification_deliveries,public.review_ai_insights,public.route_snapshots;

insert into public.cancellation_reasons(code,label,applies_to,sort_order) values
('SCHEDULE_CHANGED','Schedule changed','BOTH',10),('WORKER_UNAVAILABLE','Worker unavailable','WORKER',20),('CUSTOMER_UNAVAILABLE','Customer unavailable','USER',30),('PRICE_DISAGREEMENT','Price disagreement','BOTH',40),('OTHER','Other','BOTH',100)
on conflict(code) do update set label=excluded.label,applies_to=excluded.applies_to,sort_order=excluded.sort_order;

insert into public.system_settings(key,value) values
('ai.enabled','false'),
('ai.consent_version','"2026-07-21"'),
('ai.gemini_model','"gemini-2.5-flash"'),
('ai.openai_model','"gpt-5.6-terra"'),
('ai.openai_transcription_model','"gpt-4o-mini-transcribe-2025-12-15"'),
('ai.per_user_daily_quota','20'),
('ai.platform_monthly_budget_minor','0'),
('ai.max_concurrency','4'),
('ai.timeout_ms','45000'),
('ai.circuit_breaker_failures','5'),
('geocoding.enabled','true'),
('matching.weights','{"distance":0.30,"rating":0.20,"availability":0.20,"completed_jobs":0.10,"response_history":0.10,"cancellation_history":0.05,"priority":0.05}'),
('maps.style_url','"https://tiles.openfreemap.org/styles/liberty"')
on conflict(key) do nothing;
