-- Corrective migration: re-assert the Auth -> application-account provisioning
-- contract on hosted. The live DB (qsurouiyvisykjkgjqmz) records several
-- migrations as applied whose objects were never created (see
-- 20260818000000_prod_missing_schema_objects.sql). One consequence: the
-- provision_account_after_auth_insert trigger on auth.users is missing, so new
-- signups get an auth identity with no public.accounts row, and get_my_profile
-- fails with ACCOUNT_NOT_FOUND (P0002). This migration re-creates the triggers
-- and back-fills accounts + profiles for identities that were never provisioned.
-- Idempotent on fresh environments where the originals already ran.

-- 1) Re-assert the provisioning and activation triggers.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_confirmed on auth.users;
drop trigger if exists provision_account_after_auth_insert on auth.users;
create trigger provision_account_after_auth_insert
after insert on auth.users
for each row execute function public.provision_account();

drop trigger if exists activate_account_after_email_confirmation on auth.users;
create trigger activate_account_after_email_confirmation
after update of email, email_confirmed_at on auth.users
for each row execute function public.activate_confirmed_account();

-- 2) Reusable back-fill for auth identities that lack an application account.
--    Mirrors provision_account()'s insert logic but is lenient on mobile: a
--    malformed number is stored as null rather than raising.
create or replace function public.reconcile_unprovisioned_accounts()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  identity_row auth.users;
  requested_role public.account_role;
  display_name text;
  mobile_value text;
  created_count integer := 0;
begin
  for identity_row in
    select auth_user.*
    from auth.users auth_user
    where not exists (
      select 1 from public.accounts account
      where account.id = auth_user.id
    )
  loop
    if identity_row.email is null
      or upper(coalesce(identity_row.raw_user_meta_data->>'role', ''))
        not in ('USER', 'WORKER', 'ADMIN')
    then
      continue;
    end if;
    requested_role :=
      upper(coalesce(identity_row.raw_user_meta_data->>'role', ''))
      ::public.account_role;

    display_name := btrim(coalesce(identity_row.raw_user_meta_data->>'name', ''));
    if length(display_name) < 2 then
      display_name := split_part(coalesce(identity_row.email, ''), '@', 1);
    end if;
    if length(display_name) < 2 then
      display_name := 'User';
    end if;

    mobile_value := nullif(
      regexp_replace(
        btrim(coalesce(identity_row.raw_user_meta_data->>'mobile', '')),
        '[[:space:]]',
        '',
        'g'
      ),
      ''
    );
    if mobile_value ~ '^09[0-9]{9}$' then
      mobile_value := '+63' || substr(mobile_value, 2);
    end if;
    if mobile_value !~ '^\+[1-9][0-9]{7,14}$'
      or exists (
        select 1 from public.accounts existing_account
        where existing_account.mobile = mobile_value
      )
    then
      mobile_value := null;
    end if;

    insert into public.accounts(id, role, status, email, mobile, is_protected)
    values (
      identity_row.id,
      requested_role,
      case
        when requested_role = 'ADMIN' or identity_row.email_confirmed_at is not null
          then 'ACTIVE'::public.account_status
        else 'PENDING_VERIFICATION'::public.account_status
      end,
      lower(identity_row.email),
      mobile_value,
      requested_role = 'ADMIN'
    );

    if requested_role = 'USER' then
      insert into public.user_profiles(account_id, display_name)
      values (identity_row.id, display_name);
    elsif requested_role = 'WORKER' then
      insert into public.worker_profiles(account_id, display_name)
      values (identity_row.id, display_name);
    else
      insert into public.admin_profiles(account_id, display_name)
      values (identity_row.id, display_name);
    end if;

    created_count := created_count + 1;
  end loop;

  return created_count;
end $$;

revoke all on function public.reconcile_unprovisioned_accounts() from public, anon, authenticated;

select public.reconcile_unprovisioned_accounts();

notify pgrst, 'reload schema';
