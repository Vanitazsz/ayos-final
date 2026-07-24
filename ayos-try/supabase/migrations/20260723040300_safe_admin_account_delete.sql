begin;
-- Keep hard deletion predictable and auditable. Only empty customer/worker
-- accounts may be removed; retained marketplace history must cause a named
-- conflict so administrators can suspend the account instead.
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
  target public.accounts;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  if p_account_id is null or p_account_id = auth.uid() then
    raise exception using
      errcode = '42501',
      message = 'ACCOUNT_DELETE_NOT_ALLOWED';
  end if;

  select account.*
  into target
  from public.accounts account
  where account.id = p_account_id
  for update;

  if target.id is null then
    raise exception using errcode = 'P0002', message = 'ACCOUNT_NOT_FOUND';
  end if;
  if target.role = 'ADMIN' or target.is_protected then
    raise exception using
      errcode = '42501',
      message = 'ADMIN_ACCOUNT_DELETE_NOT_ALLOWED';
  end if;
  if lower(btrim(coalesce(p_confirmation_email, ''))) <> lower(target.email) then
    raise exception using
      errcode = '22023',
      message = 'ACCOUNT_DELETE_CONFIRMATION_MISMATCH';
  end if;
  if exists (
    select 1
    from storage.objects object
    where object.owner_id::text = target.id::text
       or object.name like target.id::text || '/%'
  ) then
    raise exception using
      errcode = '23503',
      message = 'ACCOUNT_DELETE_BLOCKED_BY_RELATED_RECORDS',
      detail = 'Remove private account files through the Storage API before deleting the account.';
  end if;

  begin
    if target.role = 'WORKER' then
      -- Matching candidates are transient and payout/wallet shells contain no
      -- money unless their restrictive transaction dependencies are present.
      delete from public.match_candidates where worker_id = target.id;
      delete from public.payout_destinations where worker_id = target.id;
      delete from public.wallet_accounts where account_id = target.id;
      delete from public.worker_profiles where account_id = target.id;
    else
      delete from public.user_profiles where account_id = target.id;
    end if;

    delete from public.accounts where id = target.id;
    delete from auth.users where id = target.id;
  exception
    when foreign_key_violation then
      raise exception using
        errcode = '23503',
        message = 'ACCOUNT_DELETE_BLOCKED_BY_RELATED_RECORDS',
        detail = 'Suspend the account when requests, bookings, payments, messages, support, AI, wallet, or other retained records exist.';
  end;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'ACCOUNT_DELETED',
    'account',
    target.id::text,
    jsonb_build_object(
      'role',
      target.role,
      'email_sha256',
      encode(extensions.digest(lower(target.email), 'sha256'), 'hex')
    )
  );
end;
$$;
revoke all on function public.admin_delete_account(uuid, text)
from public, anon;
grant execute on function public.admin_delete_account(uuid, text)
to authenticated;
commit;
