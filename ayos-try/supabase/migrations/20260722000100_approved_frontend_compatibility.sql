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
