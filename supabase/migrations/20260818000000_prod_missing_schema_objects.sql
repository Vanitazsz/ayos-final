-- Corrective migration: production schema gap.
-- The live DB (qsurouiyvisykjkgjqmz) has migrations recorded as applied in
-- supabase_migrations.schema_migrations whose objects were never created, so
-- `supabase db push` will never re-run them. This migration re-creates the
-- subset of those objects that application code actually uses.
-- Idempotent (safe on fresh environments where the originals already ran).

-- Source: 20260722000700_subdivisions.sql (subdivisions feature)
create table if not exists public.subdivisions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 160),
  center_lat double precision not null check (center_lat between -90 and 90),
  center_lng double precision not null check (center_lng between -180 and 180),
  radius_meters integer not null default 2000 check (radius_meters between 100 and 50000),
  boundary jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subdivisions_name_key on public.subdivisions(lower(name));
create index if not exists subdivisions_active_idx on public.subdivisions(is_active, name);

alter table public.user_profiles
  add column if not exists subdivision_id uuid references public.subdivisions(id) on delete set null;
alter table public.worker_profiles
  add column if not exists subdivision_id uuid references public.subdivisions(id) on delete set null;
alter table public.service_requests
  add column if not exists subdivision_id uuid references public.subdivisions(id) on delete set null;

create index if not exists user_profiles_subdivision_idx on public.user_profiles(subdivision_id);
create index if not exists worker_profiles_subdivision_idx on public.worker_profiles(subdivision_id, approval_status, is_available);
create index if not exists service_requests_subdivision_idx on public.service_requests(subdivision_id, status);

alter table public.subdivisions enable row level security;
revoke all on public.subdivisions from anon, authenticated;
grant select on public.subdivisions to authenticated;
grant select, insert, update, delete on public.subdivisions to service_role;

drop policy if exists subdivisions_authenticated_read on public.subdivisions;
create policy subdivisions_authenticated_read on public.subdivisions
for select to authenticated using (is_active or public.is_admin(false));

drop policy if exists subdivisions_admin_insert on public.subdivisions;
create policy subdivisions_admin_insert on public.subdivisions
for insert to authenticated with check (public.is_admin(true));

drop policy if exists subdivisions_admin_update on public.subdivisions;
create policy subdivisions_admin_update on public.subdivisions
for update to authenticated using (public.is_admin(true)) with check (public.is_admin(true));

drop policy if exists subdivisions_admin_delete on public.subdivisions;
create policy subdivisions_admin_delete on public.subdivisions
for delete to authenticated using (public.is_admin(true));

create or replace function public.auto_detect_subdivision(
  p_lat double precision,
  p_lng double precision
) returns setof public.subdivisions
language sql stable security definer set search_path = '' as $$
  select subdivision.*
  from public.subdivisions subdivision
  where subdivision.is_active
    and extensions.st_dwithin(
      extensions.st_setsrid(extensions.st_makepoint(subdivision.center_lng, subdivision.center_lat), 4326)::extensions.geography,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
      subdivision.radius_meters
    )
  order by extensions.st_distance(
    extensions.st_setsrid(extensions.st_makepoint(subdivision.center_lng, subdivision.center_lat), 4326)::extensions.geography,
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
  ), subdivision.name
  limit 1
$$;

create or replace function public.set_my_subdivision(p_subdivision_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare selected_id uuid; account_role public.account_role;
begin
  select subdivision.id into selected_id
  from public.subdivisions subdivision
  where subdivision.id = p_subdivision_id and subdivision.is_active;
  if selected_id is null then
    raise exception using errcode = '22023', message = 'SUBDIVISION_UNAVAILABLE';
  end if;
  select account.role into account_role from public.accounts account
  where account.id = auth.uid() and account.status = 'ACTIVE' and account.deleted_at is null;
  if account_role = 'USER' then
    update public.user_profiles set subdivision_id = selected_id, updated_at = now()
    where account_id = auth.uid();
  elsif account_role = 'WORKER' then
    update public.worker_profiles set subdivision_id = selected_id, updated_at = now()
    where account_id = auth.uid();
  else
    raise exception using errcode = '42501', message = 'CUSTOMER_OR_WORKER_REQUIRED';
  end if;
  if not found then raise exception using errcode = 'P0002', message = 'PROFILE_NOT_FOUND'; end if;
  return selected_id;
end $$;

revoke all on function public.auto_detect_subdivision(double precision, double precision) from public, anon;
revoke all on function public.set_my_subdivision(uuid) from public, anon;
grant execute on function public.auto_detect_subdivision(double precision, double precision) to authenticated;
grant execute on function public.set_my_subdivision(uuid) to authenticated;

-- Source: 20260722001000_message_translation_ui.sql (chat translation)
create or replace function public.get_conversation_recipient_locale(p_conversation_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare recipient_id uuid; locale text;
begin
  if not public.is_conversation_participant(p_conversation_id) then
    raise exception using errcode = '42501', message = 'CONVERSATION_UNAVAILABLE';
  end if;
  select participant.account_id into recipient_id
  from public.conversation_participants participant
  where participant.conversation_id = p_conversation_id and participant.account_id <> auth.uid()
  order by participant.joined_at limit 1;
  select coalesce(customer.preferred_locale, worker.preferred_locale, 'en') into locale
  from public.accounts account
  left join public.user_profiles customer on customer.account_id = account.id
  left join public.worker_profiles worker on worker.account_id = account.id
  where account.id = recipient_id;
  return case when locale = 'fil' then 'fil' else 'en' end;
end $$;

revoke all on function public.get_conversation_recipient_locale(uuid) from public, anon;
grant execute on function public.get_conversation_recipient_locale(uuid) to authenticated;

-- Source: 20260721000200_profile_communication_parity.sql (support inbox)
create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references public.accounts(id) on delete restrict,
  body text not null check (length(trim(body)) between 1 and 4000),
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists support_ticket_messages_ticket_time_idx on public.support_ticket_messages(ticket_id, created_at);

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

revoke all on function public.send_support_message(uuid, text, boolean) from public, anon;
grant execute on function public.send_support_message(uuid, text, boolean) to authenticated;

-- Source: 20260721001000_complete_backend_integration.sql (push notifications)
create table if not exists public.push_subscriptions (
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
create table if not exists public.push_delivery_attempts (
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
drop policy if exists push_subscriptions_owner_read on public.push_subscriptions;
create policy push_subscriptions_owner_read on public.push_subscriptions
for select to authenticated using (account_id = auth.uid() or public.is_admin(true));
drop policy if exists push_attempts_owner_or_admin_read on public.push_delivery_attempts;
create policy push_attempts_owner_or_admin_read on public.push_delivery_attempts
for select to authenticated using (
  public.is_admin(true) or exists (
    select 1 from public.push_subscriptions subscription
    where subscription.id = subscription_id and subscription.account_id = auth.uid()
  )
);
drop trigger if exists set_push_subscriptions_updated_at on public.push_subscriptions;
create trigger set_push_subscriptions_updated_at before update on public.push_subscriptions
for each row execute function public.set_updated_at();
