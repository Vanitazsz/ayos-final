-- Admin bulk RPCs for WORKER accounts: status and verification. Mirrors the
-- customer bulk RPCs (admin_bulk_set_account_status /
-- admin_bulk_set_customer_verification) but scoped to accounts.role = 'WORKER'.
-- Worker "verification" is modeled as worker_profiles.approval_status, so
-- Verify/Unverify overrides it the same way admin_set_customer_verification
-- overrides user_profiles. Also reconciles worker_verifications to match.
-- Originally shipped as scratch SQL (supabase/admin-worker-bulk-actions-rpc.sql)
-- but was never applied, so the admin workers page returned 404 on RPC calls.

begin;

create or replace function public.admin_bulk_set_worker_status(
  p_account_ids uuid[],
  p_next_status account_status
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer := 0;
  affected uuid[];
  target_id uuid;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if p_account_ids is null or array_length(p_account_ids, 1) is null then
    raise exception using errcode = '22004', message = 'INVALID_ACCOUNT_IDS';
  end if;

  with target as (
    select account.id
    from public.accounts account
    where account.id = any(p_account_ids)
      and account.role = 'WORKER'
      and account.deleted_at is null
      and account.status is distinct from p_next_status
  ), updated as (
    update public.accounts account
    set status = p_next_status
    from target
    where account.id = target.id
    returning account.id
  )
  select array_agg(id) into affected from updated;

  if affected is not null then
    foreach target_id in array affected
    loop
      insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
      values (
        auth.uid(),
        'ACCOUNT_STATUS_CHANGED',
        'account',
        target_id::text,
        jsonb_build_object('status', p_next_status)
      );
      updated_count := updated_count + 1;
    end loop;
  end if;

  return updated_count;
end
$$;

revoke all on function public.admin_bulk_set_worker_status(uuid[], account_status) from public, anon;
grant execute on function public.admin_bulk_set_worker_status(uuid[], account_status) to authenticated;

create or replace function public.admin_bulk_set_worker_verification(
  p_worker_ids uuid[],
  p_status text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer := 0;
  affected uuid[];
  target_id uuid;
  normalized_status text := lower(btrim(coalesce(p_status, '')));
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if normalized_status not in ('verified', 'unverified') then
    raise exception using errcode = '22023', message = 'INVALID_VERIFICATION_STATUS';
  end if;

  if p_worker_ids is null or array_length(p_worker_ids, 1) is null then
    raise exception using errcode = '22004', message = 'INVALID_WORKER_IDS';
  end if;

  with target as (
    select profile.account_id
    from public.worker_profiles profile
    join public.accounts account on account.id = profile.account_id
    where account.id = any(p_worker_ids)
      and account.role = 'WORKER'
      and account.deleted_at is null
      and profile.approval_status is distinct from
        case when normalized_status = 'verified' then 'APPROVED' else 'PENDING' end
  ), updated as (
    update public.worker_profiles profile
    set approval_status = case
          when normalized_status = 'verified' then 'APPROVED'
          else 'PENDING'
        end,
        approved_at = case
          when normalized_status = 'verified' then coalesce(approved_at, now())
          else null
        end,
        is_available = case
          when normalized_status = 'verified' then true
          else false
        end,
        updated_at = now()
    from target
    where profile.account_id = target.account_id
    returning profile.account_id
  )
  select array_agg(account_id) into affected from updated;

  if affected is not null then
    update public.worker_verifications verification
    set status = case
          when normalized_status = 'verified' then 'APPROVED'
          else 'PENDING'
        end,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        updated_at = now()
    where verification.worker_id = any(affected);

    foreach target_id in array affected
    loop
      insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
      values (
        auth.uid(),
        'WORKER_VERIFICATION_STATUS_UPDATED',
        'account',
        target_id::text,
        jsonb_build_object('verification_status', normalized_status)
      );
      updated_count := updated_count + 1;
    end loop;
  end if;

  return updated_count;
end
$$;

revoke all on function public.admin_bulk_set_worker_verification(uuid[], text) from public, anon;
grant execute on function public.admin_bulk_set_worker_verification(uuid[], text) to authenticated;

notify pgrst, 'reload schema';

commit;
