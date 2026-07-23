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
