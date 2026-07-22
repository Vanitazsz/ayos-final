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

alter table public.admin_profiles drop constraint if exists admin_profiles_given_name_check;
alter table public.admin_profiles add constraint admin_profiles_given_name_check
  check (given_name is null or length(given_name) between 1 and 80);
alter table public.admin_profiles drop constraint if exists admin_profiles_family_name_check;
alter table public.admin_profiles add constraint admin_profiles_family_name_check
  check (family_name is null or length(family_name) between 1 and 80);
alter table public.admin_profiles drop constraint if exists admin_profiles_location_check;
alter table public.admin_profiles add constraint admin_profiles_location_check
  check (location is null or length(location) <= 255);
alter table public.admin_profiles drop constraint if exists admin_profiles_bio_check;
alter table public.admin_profiles add constraint admin_profiles_bio_check
  check (bio is null or length(bio) <= 2000);

alter table public.support_tickets
  add column if not exists category text,
  add column if not exists priority text,
  add column if not exists assigned_to uuid references public.accounts(id) on delete set null;

alter table public.support_tickets drop constraint if exists support_tickets_category_check;
alter table public.support_tickets add constraint support_tickets_category_check
  check (category is null or length(category) between 2 and 80);
alter table public.support_tickets drop constraint if exists support_tickets_priority_check;
alter table public.support_tickets add constraint support_tickets_priority_check
  check (priority is null or priority in ('LOW','MEDIUM','HIGH','URGENT'));

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

create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, account_id)
);

create table if not exists public.worker_portfolio_media (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(account_id) on delete cascade,
  storage_path text not null unique,
  caption text,
  sort_order integer not null default 0 check (sort_order between 0 and 1000),
  created_at timestamptz not null default now(),
  constraint worker_portfolio_media_caption_check check (caption is null or length(caption) <= 300),
  constraint worker_portfolio_media_owned_path_check check (split_part(storage_path, '/', 1) = worker_id::text)
);
create index if not exists worker_portfolio_media_worker_sort_idx
  on public.worker_portfolio_media(worker_id, sort_order, created_at);

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
    display_name := nullif(btrim(bootstrap_request.display_name), '');
  else
    requested_role_text := upper(nullif(btrim(coalesce(new.raw_user_meta_data->>'role', '')), ''));
    if requested_role_text is null then requested_role := 'USER';
    elsif requested_role_text in ('USER','WORKER') then requested_role := requested_role_text::public.account_role;
    else raise exception using errcode='42501', message='Invalid account role'; end if;
    display_name := nullif(btrim(coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'display_name'
    )), '');
  end if;

  if display_name is null or length(display_name) < 2 or length(display_name) > 120 then
    raise exception using errcode='22023', message='PROFILE_NAME_REQUIRED';
  end if;

  mobile_value := nullif(btrim(coalesce(new.raw_user_meta_data->>'mobile', '')), '');
  insert into public.accounts(id, role, status, email, mobile, is_protected, profile_completed_at)
  values(new.id, requested_role,
    case when requested_role='ADMIN' or new.email_confirmed_at is not null then 'ACTIVE'::public.account_status else 'PENDING_VERIFICATION'::public.account_status end,
    lower(new.email), mobile_value, requested_role='ADMIN', now());
  if requested_role='USER' then insert into public.user_profiles(account_id,display_name) values(new.id,display_name);
  elsif requested_role='WORKER' then insert into public.worker_profiles(account_id,display_name) values(new.id,display_name);
  else insert into public.admin_profiles(account_id,display_name,given_name) values(new.id,display_name,display_name); end if;
  return new;
end $$;

create or replace function public.enable_secondary_role(p_role public.account_role) returns public.account_role
language plpgsql security definer set search_path = '' as $$
declare primary_role public.account_role; v_display_name text;
begin
  select role into primary_role from public.accounts where id=auth.uid() and status='ACTIVE' and deleted_at is null for update;
  if primary_role is null or primary_role='ADMIN' or p_role='ADMIN' then
    raise exception using errcode='42501',message='Role switching is unavailable';
  end if;
  if p_role='USER' then
    select display_name into v_display_name from public.worker_profiles where account_id=auth.uid();
    if nullif(btrim(v_display_name),'') is null then raise exception using errcode='22023',message='PROFILE_NAME_REQUIRED'; end if;
    insert into public.user_profiles(account_id,display_name) values(auth.uid(),v_display_name) on conflict(account_id) do nothing;
  elsif p_role='WORKER' then
    select display_name into v_display_name from public.user_profiles where account_id=auth.uid();
    if nullif(btrim(v_display_name),'') is null then raise exception using errcode='22023',message='PROFILE_NAME_REQUIRED'; end if;
    insert into public.worker_profiles(account_id,display_name) values(auth.uid(),v_display_name) on conflict(account_id) do nothing;
  end if;
  insert into public.account_role_memberships(account_id,role,status) values(auth.uid(),p_role,'ACTIVE')
  on conflict(account_id,role) do update set status='ACTIVE',revoked_at=null;
  return p_role;
end $$;

create or replace function public.get_my_profile() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare account public.accounts; active_role public.account_role; profile jsonb; default_address jsonb;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select * into account from public.accounts where id=auth.uid() and deleted_at is null;
  if account.id is null then raise exception using errcode='P0002',message='ACCOUNT_NOT_FOUND'; end if;
  active_role := public.current_role();
  if active_role='USER' then select to_jsonb(row) into profile from public.user_profiles row where account_id=account.id;
  elsif active_role='WORKER' then select to_jsonb(row) into profile from public.worker_profiles row where account_id=account.id;
  elsif active_role='ADMIN' then select to_jsonb(row) into profile from public.admin_profiles row where account_id=account.id;
  end if;
  select to_jsonb(row) into default_address from public.addresses row where account_id=account.id order by is_default desc,created_at desc limit 1;
  return jsonb_build_object(
    'account',to_jsonb(account)-'is_protected',
    'active_role',active_role,
    'profile',profile,
    'default_address',default_address,
    'email_verified',exists(select 1 from auth.users where id=account.id and email_confirmed_at is not null),
    'profile_complete',account.profile_completed_at is not null
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
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  normalized_name := nullif(btrim(p_display_name),'');
  normalized_mobile := nullif(btrim(p_mobile),'');
  if normalized_name is null or length(normalized_name) not between 2 and 120 then
    raise exception using errcode='22023',message='INVALID_DISPLAY_NAME';
  end if;
  if normalized_mobile is not null and normalized_mobile !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception using errcode='22023',message='INVALID_MOBILE';
  end if;
  update public.accounts set mobile=normalized_mobile,updated_at=now() where id=auth.uid() and deleted_at is null;
  active_role := public.current_role();
  if active_role='USER' then
    update public.user_profiles set display_name=normalized_name,updated_at=now() where account_id=auth.uid();
  elsif active_role='WORKER' then
    update public.worker_profiles set display_name=normalized_name,bio=nullif(btrim(p_bio),''),service_area=nullif(btrim(p_location),''),updated_at=now() where account_id=auth.uid();
  elsif active_role='ADMIN' then
    update public.admin_profiles set display_name=normalized_name,given_name=nullif(btrim(p_given_name),''),family_name=nullif(btrim(p_family_name),''),location=nullif(btrim(p_location),''),bio=nullif(btrim(p_bio),''),updated_at=now() where account_id=auth.uid();
  end if;
  if not found then raise exception using errcode='P0002',message='PROFILE_NOT_FOUND'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'PROFILE_UPDATED','account',auth.uid()::text);
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
  perform public.update_my_profile(p_display_name,p_mobile,p_location,p_bio,p_given_name,p_family_name);
  update public.accounts set profile_completed_at=now(),updated_at=now() where id=auth.uid();
  return public.get_my_profile();
end $$;

create or replace function public.set_my_avatar(p_storage_path text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare active_role public.account_role; normalized_path text;
begin
  normalized_path := nullif(btrim(p_storage_path),'');
  if normalized_path is not null and split_part(normalized_path,'/',1) <> auth.uid()::text then
    raise exception using errcode='42501',message='INVALID_AVATAR_PATH';
  end if;
  active_role := public.current_role();
  if active_role='USER' then update public.user_profiles set avatar_path=normalized_path,updated_at=now() where account_id=auth.uid();
  elsif active_role='WORKER' then update public.worker_profiles set avatar_path=normalized_path,updated_at=now() where account_id=auth.uid();
  elsif active_role='ADMIN' then update public.admin_profiles set avatar_path=normalized_path,updated_at=now() where account_id=auth.uid();
  end if;
  if not found then raise exception using errcode='P0002',message='PROFILE_NOT_FOUND'; end if;
  return public.get_my_profile();
end $$;

create or replace function public.record_my_password_change() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare changed_at timestamptz := now();
begin
  update public.accounts set password_changed_at=changed_at,updated_at=changed_at where id=auth.uid();
  insert into public.authentication_events(account_id,event_type,created_at) values(auth.uid(),'PASSWORD_CHANGED',changed_at);
  return changed_at;
end $$;

create or replace function public.mark_conversation_read(p_conversation_id uuid) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare read_at timestamptz := now();
begin
  if not public.is_conversation_participant(p_conversation_id) then raise exception using errcode='42501',message='CONVERSATION_ACCESS_DENIED'; end if;
  insert into public.conversation_reads(conversation_id,account_id,last_read_at) values(p_conversation_id,auth.uid(),read_at)
  on conflict(conversation_id,account_id) do update set last_read_at=excluded.last_read_at;
  return read_at;
end $$;

create or replace function public.admin_update_support_details(
  p_ticket_id uuid,
  p_category text default null,
  p_priority text default null,
  p_assigned_to uuid default null
) returns public.support_tickets language plpgsql security definer set search_path = '' as $$
declare result public.support_tickets;
begin
  if not public.is_admin(true) then raise exception using errcode='42501',message='AAL2 administrator required'; end if;
  if p_priority is not null and upper(p_priority) not in ('LOW','MEDIUM','HIGH','URGENT') then raise exception using errcode='22023',message='INVALID_PRIORITY'; end if;
  if p_assigned_to is not null and not exists(select 1 from public.accounts where id=p_assigned_to and role='ADMIN' and status='ACTIVE' and deleted_at is null) then
    raise exception using errcode='22023',message='INVALID_ASSIGNEE';
  end if;
  update public.support_tickets set category=nullif(btrim(p_category),''),priority=upper(nullif(btrim(p_priority),'')),assigned_to=p_assigned_to,updated_at=now()
  where id=p_ticket_id returning * into result;
  if result.id is null then raise exception using errcode='P0002',message='TICKET_NOT_FOUND'; end if;
  return result;
end $$;

alter table public.authentication_events enable row level security;
alter table public.conversation_reads enable row level security;
alter table public.worker_portfolio_media enable row level security;

create policy authentication_events_owner_admin_read on public.authentication_events for select to authenticated
using(account_id=auth.uid() or public.is_admin(false));
create policy conversation_reads_participant_read on public.conversation_reads for select to authenticated
using(account_id=auth.uid() and public.is_conversation_participant(conversation_id));
create policy worker_portfolio_authenticated_read on public.worker_portfolio_media for select to authenticated
using(exists(select 1 from public.worker_profiles worker where worker.account_id=worker_id and (worker.approval_status='APPROVED' or worker.account_id=auth.uid() or public.is_admin(false))));
create policy worker_portfolio_owner_write on public.worker_portfolio_media for all to authenticated
using(worker_id=auth.uid() or public.is_admin(false)) with check(worker_id=auth.uid() or public.is_admin(false));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('profile-avatars','profile-avatars',false,5242880,array['image/jpeg','image/png','image/webp','image/heic']),
  ('worker-portfolio','worker-portfolio',false,10485760,array['image/jpeg','image/png','image/webp','image/heic'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy profile_media_authenticated_read on storage.objects for select to authenticated
using(bucket_id in ('profile-avatars','worker-portfolio'));
create policy profile_media_owner_insert on storage.objects for insert to authenticated
with check(bucket_id in ('profile-avatars','worker-portfolio') and (storage.foldername(name))[1]=auth.uid()::text);
create policy profile_media_owner_update on storage.objects for update to authenticated
using(bucket_id in ('profile-avatars','worker-portfolio') and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin(false)))
with check(bucket_id in ('profile-avatars','worker-portfolio') and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin(false)));
create policy profile_media_owner_delete on storage.objects for delete to authenticated
using(bucket_id in ('profile-avatars','worker-portfolio') and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin(false)));

grant select on public.authentication_events,public.conversation_reads,public.worker_portfolio_media to authenticated;
grant insert,update,delete on public.worker_portfolio_media to authenticated;
revoke all on function public.get_my_profile() from public,anon;
revoke all on function public.update_my_profile(text,text,text,text,text,text) from public,anon;
revoke all on function public.complete_my_profile(text,text,text,text,text,text) from public,anon;
revoke all on function public.set_my_avatar(text) from public,anon;
revoke all on function public.record_my_password_change() from public,anon;
revoke all on function public.mark_conversation_read(uuid) from public,anon;
revoke all on function public.admin_update_support_details(uuid,text,text,uuid) from public,anon;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.update_my_profile(text,text,text,text,text,text) to authenticated;
grant execute on function public.complete_my_profile(text,text,text,text,text,text) to authenticated;
grant execute on function public.set_my_avatar(text) to authenticated;
grant execute on function public.record_my_password_change() to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.admin_update_support_details(uuid,text,text,uuid) to authenticated;

commit;
