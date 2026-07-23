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

