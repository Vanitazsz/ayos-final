-- A-YOS hosted-project patch: confirmed User and Worker account deletion.
-- Apply once in the Supabase SQL Editor.

begin;

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
  target_account public.accounts;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if p_account_id is null or p_account_id = auth.uid() then
    raise exception using errcode = '42501', message = 'ACCOUNT_DELETE_NOT_ALLOWED';
  end if;

  select account.*
  into target_account
  from public.accounts account
  where account.id = p_account_id
  for update;

  if target_account.id is null then
    raise exception using errcode = 'P0002', message = 'ACCOUNT_NOT_FOUND';
  end if;

  if target_account.role = 'ADMIN' or target_account.is_protected then
    raise exception using errcode = '42501', message = 'ADMIN_ACCOUNT_DELETE_NOT_ALLOWED';
  end if;

  if lower(trim(coalesce(p_confirmation_email, ''))) <> lower(target_account.email) then
    raise exception using errcode = '22023', message = 'ACCOUNT_DELETE_CONFIRMATION_MISMATCH';
  end if;

  if exists(select 1 from storage.objects where owner_id = p_account_id::text) then
    raise exception using
      errcode = '23503',
      message = 'ACCOUNT_DELETE_BLOCKED_BY_RELATED_RECORDS',
      detail = 'Remove the account private files through the Storage API before deleting the account.';
  end if;

  begin
    -- If a retained business record references the account, the exception
    -- block rolls back every deletion in this operation.
    delete from public.user_profiles where account_id = p_account_id;
    delete from public.worker_profiles where account_id = p_account_id;
    delete from public.accounts where id = p_account_id;
    delete from auth.users where id = p_account_id;
  exception
    when foreign_key_violation then
      raise exception using
        errcode = '23503',
        message = 'ACCOUNT_DELETE_BLOCKED_BY_RELATED_RECORDS',
        detail = 'Suspend the account when bookings, payments, messages, support, or other retained records exist.';
  end;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'ACCOUNT_DELETED',
    'account',
    p_account_id::text,
    jsonb_build_object(
      'role', target_account.role,
      'email_sha256', encode(extensions.digest(lower(target_account.email), 'sha256'), 'hex')
    )
  );
end
$$;

revoke all on function public.admin_delete_account(uuid, text) from public, anon;
grant execute on function public.admin_delete_account(uuid, text) to authenticated;

commit;
