-- Worker deletion must remain reversible when retained business records exist.

create or replace function public.admin_soft_delete_account(p_account_id uuid)
returns public.trash_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.accounts;
  profile jsonb;
  result public.trash_entries;
  entity_type text;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if p_account_id is null or p_account_id = auth.uid() then
    raise exception using errcode = '42501', message = 'ACCOUNT_DELETE_NOT_ALLOWED';
  end if;

  select account.* into target
  from public.accounts account
  where account.id = p_account_id
  for update;

  if target.id is null then
    raise exception using errcode = 'P0002', message = 'ACCOUNT_NOT_FOUND';
  end if;
  if target.role not in ('USER', 'WORKER') or target.is_protected then
    raise exception using errcode = '42501', message = 'ACCOUNT_DELETE_NOT_ALLOWED';
  end if;
  if target.deleted_at is not null then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_ALREADY_DELETED';
  end if;

  if target.role = 'USER' then
    select to_jsonb(row) into profile
    from public.user_profiles row
    where row.account_id = target.id;
    entity_type := 'user';
  else
    select to_jsonb(row) into profile
    from public.worker_profiles row
    where row.account_id = target.id;
    entity_type := 'worker';
  end if;

  update public.accounts
  set status = 'SUSPENDED', deleted_at = now(), updated_at = now()
  where id = target.id;

  insert into public.trash_entries(entity_type, entity_id, snapshot, deleted_by)
  values (
    entity_type,
    target.id::text,
    jsonb_build_object('account', to_jsonb(target), 'profile', profile),
    auth.uid()
  )
  returning * into result;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'ACCOUNT_SOFT_DELETED', entity_type, target.id::text);

  return result;
end
$$;

create or replace function public.restore_from_trash(trash_id uuid)
returns public.trash_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.trash_entries;
  restored_status public.account_status;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select entry.* into result
  from public.trash_entries entry
  where entry.id = trash_id and entry.restored_at is null
  for update;

  if result.id is null then
    raise exception using errcode = 'P0001', message = 'RESTORE_NOT_ALLOWED';
  end if;

  if result.entity_type = 'service_template' then
    update public.service_templates template
    set archived_at = null,
        is_active = coalesce((result.snapshot->>'is_active')::boolean, true)
    where template.id = result.entity_id::uuid and template.archived_at is not null;
    if not found then
      raise exception using errcode = 'P0001', message = 'RESTORE_NOT_ALLOWED';
    end if;
  elsif result.entity_type in ('user', 'worker') then
    restored_status := coalesce(
      (result.snapshot->'account'->>'status')::public.account_status,
      'ACTIVE'::public.account_status
    );
    update public.accounts
    set status = restored_status, deleted_at = null, updated_at = now()
    where id = result.entity_id::uuid and deleted_at is not null;
    if not found then
      raise exception using errcode = 'P0001', message = 'RESTORE_NOT_ALLOWED';
    end if;
    if result.entity_type = 'user' then
      update public.user_profiles
      set display_name = coalesce(result.snapshot->'profile'->>'display_name', display_name),
          updated_at = now()
      where account_id = result.entity_id::uuid;
    else
      update public.worker_profiles
      set display_name = coalesce(result.snapshot->'profile'->>'display_name', display_name),
          updated_at = now()
      where account_id = result.entity_id::uuid;
    end if;
  else
    raise exception using errcode = '42501', message = 'TRASH_ENTITY_RESTORE_NOT_ALLOWED';
  end if;

  update public.trash_entries entry
  set restored_at = now(), restored_by = auth.uid()
  where entry.id = result.id
  returning * into result;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'RESTORED_FROM_TRASH', result.entity_type, result.entity_id);
  return result;
end
$$;
