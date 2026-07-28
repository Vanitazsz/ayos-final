-- A-YOS hosted-project patch: complete UI parity contracts.
-- Apply once in the Supabase SQL Editor after earlier numbered migrations.

begin;

-- Minimal persisted commands required by the complete Admin reference UI.

create or replace function public.normalize_google_signup_metadata()
returns trigger language plpgsql security definer set search_path = '' as $$
declare display_name text;
begin
  if coalesce(new.raw_app_meta_data->>'provider', '') = 'google'
    and coalesce(new.raw_user_meta_data->>'role', '') = '' then
    display_name := trim(coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1),
      'A-YOS User'
    ));
    if length(display_name) < 2 then display_name := 'A-YOS User'; end if;
    new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'USER', 'name', left(display_name, 120));
  end if;
  return new;
end $$;

create trigger normalize_google_signup_metadata
before insert on auth.users
for each row execute function public.normalize_google_signup_metadata();

create table public.service_templates (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 160),
  description text check (description is null or length(description) <= 2000),
  base_price numeric(12,2) not null check (base_price >= 0),
  estimated_duration_minutes integer not null check (estimated_duration_minutes between 15 and 10080),
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(category_id, name)
);

create index service_templates_catalog_idx
  on public.service_templates(category_id, is_active, name)
  where archived_at is null;

alter table public.service_templates enable row level security;
grant select on public.service_templates to anon, authenticated;

create policy service_templates_public_read on public.service_templates
for select to anon, authenticated
using (
  archived_at is null
  and (
    is_active
    or (select auth.uid()) is not null and public.is_admin(false)
  )
);

create trigger set_service_templates_updated_at
before update on public.service_templates
for each row execute function public.set_updated_at();

create or replace function public.admin_upsert_service_template(
  p_template_id uuid,
  p_category_id uuid,
  p_name text,
  p_description text,
  p_base_price numeric,
  p_estimated_duration_minutes integer,
  p_is_active boolean
) returns public.service_templates
language plpgsql security definer set search_path = '' as $$
declare result public.service_templates;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  if length(trim(coalesce(p_name, ''))) not between 2 and 160
    or (p_description is not null and length(p_description) > 2000)
    or p_base_price is null or p_base_price < 0
    or p_estimated_duration_minutes is null
    or p_estimated_duration_minutes not between 15 and 10080
    or not exists (
      select 1 from public.service_categories category
      where category.id = p_category_id and category.is_active
    ) then
    raise exception using errcode = '22023', message = 'INVALID_SERVICE_TEMPLATE';
  end if;

  if p_template_id is null then
    insert into public.service_templates(
      category_id, name, description, base_price,
      estimated_duration_minutes, is_active
    ) values (
      p_category_id, trim(p_name), nullif(trim(coalesce(p_description, '')), ''),
      p_base_price, p_estimated_duration_minutes, p_is_active
    ) returning * into result;
  else
    update public.service_templates template
    set category_id = p_category_id,
        name = trim(p_name),
        description = nullif(trim(coalesce(p_description, '')), ''),
        base_price = p_base_price,
        estimated_duration_minutes = p_estimated_duration_minutes,
        is_active = p_is_active
    where template.id = p_template_id and template.archived_at is null
    returning * into result;
    if result.id is null then
      raise exception using errcode = 'P0002', message = 'SERVICE_TEMPLATE_NOT_FOUND';
    end if;
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'SERVICE_TEMPLATE_UPSERTED', 'service_template', result.id::text,
    jsonb_build_object('category_id', result.category_id, 'active', result.is_active)
  );
  return result;
end $$;

create or replace function public.admin_duplicate_service_template(p_template_id uuid)
returns public.service_templates
language plpgsql security definer set search_path = '' as $$
declare source public.service_templates; result public.service_templates; copy_name text;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  select template.* into source
  from public.service_templates template
  where template.id = p_template_id and template.archived_at is null;
  if source.id is null then
    raise exception using errcode = 'P0002', message = 'SERVICE_TEMPLATE_NOT_FOUND';
  end if;
  copy_name := left(source.name, 148) || ' (Copy)';
  while exists (
    select 1 from public.service_templates template
    where template.category_id = source.category_id and template.name = copy_name
  ) loop
    copy_name := left(source.name, 138) || ' (Copy ' || substr(gen_random_uuid()::text, 1, 8) || ')';
  end loop;
  insert into public.service_templates(
    category_id, name, description, base_price, estimated_duration_minutes, is_active
  ) values (
    source.category_id, copy_name, source.description, source.base_price,
    source.estimated_duration_minutes, false
  ) returning * into result;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'SERVICE_TEMPLATE_DUPLICATED', 'service_template', result.id::text,
    jsonb_build_object('source_id', source.id)
  );
  return result;
end $$;

create or replace function public.admin_archive_service_template(p_template_id uuid)
returns public.trash_entries
language plpgsql security definer set search_path = '' as $$
declare template public.service_templates; result public.trash_entries;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  update public.service_templates item
  set archived_at = now(), is_active = false
  where item.id = p_template_id and item.archived_at is null
  returning * into template;
  if template.id is null then
    raise exception using errcode = 'P0002', message = 'SERVICE_TEMPLATE_NOT_FOUND';
  end if;
  insert into public.trash_entries(entity_type, entity_id, snapshot, deleted_by)
  values ('service_template', template.id::text, to_jsonb(template), auth.uid())
  returning * into result;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'SERVICE_TEMPLATE_ARCHIVED', 'service_template', template.id::text);
  return result;
end $$;

create or replace function public.restore_from_trash(trash_id uuid)
returns public.trash_entries
language plpgsql security definer set search_path = '' as $$
declare result public.trash_entries;
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
  end if;
  update public.trash_entries entry
  set restored_at = now(), restored_by = auth.uid()
  where entry.id = result.id
  returning * into result;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'RESTORED_FROM_TRASH', result.entity_type, result.entity_id);
  return result;
end $$;

create or replace function public.permanently_delete(p_trash_id uuid, p_confirmation text)
returns void
language plpgsql security definer set search_path = '' as $$
declare entry public.trash_entries;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  select item.* into entry
  from public.trash_entries item
  where item.id = p_trash_id and item.restored_at is null
  for update;
  if entry.id is null then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;
  if trim(coalesce(p_confirmation, '')) <> 'DELETE ' || entry.entity_id then
    raise exception using errcode = '22023', message = 'DELETE_CONFIRMATION_MISMATCH';
  end if;
  if entry.entity_type = 'service_template' then
    delete from public.service_templates template
    where template.id = entry.entity_id::uuid and template.archived_at is not null;
  elsif entry.entity_type = 'review' then
    delete from public.reviews review where review.id = entry.entity_id::uuid;
  else
    raise exception using errcode = '42501', message = 'TRASH_ENTITY_DELETE_NOT_ALLOWED';
  end if;
  delete from public.trash_entries item where item.id = entry.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'PERMANENTLY_DELETED', entry.entity_type, entry.entity_id);
exception when foreign_key_violation then
  raise exception using errcode = '23503', message = 'DELETE_BLOCKED_BY_RELATED_RECORDS';
end $$;

create or replace function public.restore_all_from_trash()
returns integer
language plpgsql security definer set search_path = '' as $$
declare entry public.trash_entries; restored_count integer := 0;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  for entry in
    select item.* from public.trash_entries item
    where item.restored_at is null
    order by item.deleted_at
    for update
  loop
    perform public.restore_from_trash(entry.id);
    restored_count := restored_count + 1;
  end loop;
  return restored_count;
end $$;

create or replace function public.empty_trash(p_confirmation text)
returns integer
language plpgsql security definer set search_path = '' as $$
declare entry public.trash_entries; deleted_count integer := 0;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  if trim(coalesce(p_confirmation, '')) <> 'EMPTY TRASH' then
    raise exception using errcode = '22023', message = 'EMPTY_TRASH_CONFIRMATION_MISMATCH';
  end if;
  for entry in
    select item.* from public.trash_entries item
    where item.restored_at is null and item.entity_type in ('service_template', 'review')
    order by item.deleted_at
    for update
  loop
    if entry.entity_type = 'service_template' then
      delete from public.service_templates template
      where template.id = entry.entity_id::uuid and template.archived_at is not null;
    elsif entry.entity_type = 'review' then
      delete from public.reviews review where review.id = entry.entity_id::uuid;
    end if;
    delete from public.trash_entries item where item.id = entry.id;
    deleted_count := deleted_count + 1;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id)
    values (auth.uid(), 'PERMANENTLY_DELETED', entry.entity_type, entry.entity_id);
  end loop;
  return deleted_count;
exception when foreign_key_violation then
  raise exception using errcode = '23503', message = 'DELETE_BLOCKED_BY_RELATED_RECORDS';
end $$;

revoke all on table public.service_templates from public, anon, authenticated;
grant select on table public.service_templates to anon, authenticated;
revoke all on function public.admin_upsert_service_template(uuid,uuid,text,text,numeric,integer,boolean) from public, anon;
revoke all on function public.admin_duplicate_service_template(uuid) from public, anon;
revoke all on function public.admin_archive_service_template(uuid) from public, anon;
revoke all on function public.permanently_delete(uuid,text) from public, anon;
revoke all on function public.empty_trash(text) from public, anon;
revoke all on function public.restore_all_from_trash() from public, anon;
grant execute on function public.admin_upsert_service_template(uuid,uuid,text,text,numeric,integer,boolean) to authenticated;
grant execute on function public.admin_duplicate_service_template(uuid) to authenticated;
grant execute on function public.admin_archive_service_template(uuid) to authenticated;
grant execute on function public.permanently_delete(uuid,text) to authenticated;
grant execute on function public.empty_trash(text) to authenticated;
grant execute on function public.restore_all_from_trash() to authenticated;

commit;
