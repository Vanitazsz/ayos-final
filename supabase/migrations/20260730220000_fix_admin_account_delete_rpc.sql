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
declare target public.accounts;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  if p_account_id is null or p_account_id = auth.uid() then
    raise exception using errcode = '42501', message = 'ACCOUNT_DELETE_NOT_ALLOWED';
  end if;

  select a into target from public.accounts a where a.id = p_account_id;
  if target.id is null then
    raise exception using errcode = 'P0002', message = 'ACCOUNT_NOT_FOUND';
  end if;
  if target.role = 'ADMIN' or target.is_protected then
    raise exception using errcode = '42501', message = 'ADMIN_ACCOUNT_DELETE_NOT_ALLOWED';
  end if;
  if lower(btrim(coalesce(p_confirmation_email, ''))) <> lower(target.email) then
    raise exception using errcode = '22023', message = 'ACCOUNT_DELETE_CONFIRMATION_MISMATCH';
  end if;

  -- public.accounts and its dependent application records cascade from Auth.
  delete from auth.users where id = target.id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'ACCOUNT_DELETED', 'account', target.id::text,
    jsonb_build_object('role', target.role, 'email_sha256', encode(extensions.digest(lower(target.email), 'sha256'), 'hex')));
end;
$$;

revoke all on function public.admin_delete_account(uuid, text) from public, anon;
grant execute on function public.admin_delete_account(uuid, text) to authenticated;

commit;
