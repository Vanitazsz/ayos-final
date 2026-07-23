-- Permanently delete a customer or worker and its dependent Supabase records.
-- The operation is restricted to AAL2 admins and runs transactionally.

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
  fk record;
  key_pair record;
  table_to_delete record;
  join_clause text;
  added_rows integer;
  current_rows integer;
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
  if target.role = 'ADMIN' or target.is_protected then
    raise exception using errcode = '42501', message = 'ADMIN_ACCOUNT_DELETE_NOT_ALLOWED';
  end if;
  if lower(trim(coalesce(p_confirmation_email, ''))) <> lower(target.email) then
    raise exception using errcode = '22023', message = 'ACCOUNT_DELETE_CONFIRMATION_MISMATCH';
  end if;

  create temp table hard_delete_rows (
    table_oid oid not null,
    row_ctid tid not null,
    depth integer not null,
    primary key (table_oid, row_ctid)
  ) on commit drop;

  insert into pg_temp.hard_delete_rows(table_oid, row_ctid, depth)
  select 'public.accounts'::regclass::oid, account.ctid, 0
  from public.accounts account
  where account.id = target.id;

  -- Walk all public FK dependencies that would otherwise block account deletion.
  -- SET NULL references such as audit actors are deliberately retained.
  loop
    added_rows := 0;
    for fk in
      select
        con.conrelid as child_oid,
        con.confrelid as parent_oid,
        child_namespace.nspname as child_schema,
        child_class.relname as child_name,
        parent_namespace.nspname as parent_schema,
        parent_class.relname as parent_name,
        con.conkey as child_keys,
        con.confkey as parent_keys
      from pg_catalog.pg_constraint con
      join pg_catalog.pg_class child_class on child_class.oid = con.conrelid
      join pg_catalog.pg_namespace child_namespace on child_namespace.oid = child_class.relnamespace
      join pg_catalog.pg_class parent_class on parent_class.oid = con.confrelid
      join pg_catalog.pg_namespace parent_namespace on parent_namespace.oid = parent_class.relnamespace
      where con.contype = 'f'
        and con.confdeltype in ('a', 'r', 'c')
        and child_namespace.nspname = 'public'
        and parent_namespace.nspname = 'public'
    loop
      join_clause := '';
      for key_pair in
        select child_attribute.attname as child_column, parent_attribute.attname as parent_column
        from unnest(fk.child_keys) with ordinality child_key(attnum, position)
        join unnest(fk.parent_keys) with ordinality parent_key(attnum, position)
          on parent_key.position = child_key.position
        join pg_catalog.pg_attribute child_attribute
          on child_attribute.attrelid = fk.child_oid
         and child_attribute.attnum = child_key.attnum
        join pg_catalog.pg_attribute parent_attribute
          on parent_attribute.attrelid = fk.parent_oid
         and parent_attribute.attnum = parent_key.attnum
      loop
        if join_clause <> '' then join_clause := join_clause || ' and '; end if;
        join_clause := join_clause || format(
          'child.%I is not distinct from parent.%I',
          key_pair.child_column,
          key_pair.parent_column
        );
      end loop;

      execute format(
        'insert into pg_temp.hard_delete_rows(table_oid, row_ctid, depth)
         select %L::oid, child.ctid, min(parent_rows.depth) + 1
         from %I.%I child
         join %I.%I parent on %s
         join pg_temp.hard_delete_rows parent_rows
           on parent_rows.table_oid = %L::oid
          and parent_rows.row_ctid = parent.ctid
         group by child.ctid
         on conflict (table_oid, row_ctid) do nothing',
        fk.child_oid,
        fk.child_schema,
        fk.child_name,
        fk.parent_schema,
        fk.parent_name,
        join_clause,
        fk.parent_oid
      );
      get diagnostics current_rows = row_count;
      added_rows := added_rows + current_rows;
    end loop;
    exit when added_rows = 0;
  end loop;

  -- Remove deepest dependencies first, then the public account row.
  for table_to_delete in
    select
      rows.table_oid,
      namespace.nspname as table_schema,
      relation.relname as table_name,
      max(rows.depth) as max_depth
    from pg_temp.hard_delete_rows rows
    join pg_catalog.pg_class relation on relation.oid = rows.table_oid
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    group by rows.table_oid, namespace.nspname, relation.relname
    order by max(rows.depth) desc
  loop
    execute format(
      'delete from %I.%I where ctid in (
         select row_ctid from pg_temp.hard_delete_rows where table_oid = %L::oid
       )',
      table_to_delete.table_schema,
      table_to_delete.table_name,
      table_to_delete.table_oid
    );
  end loop;

  -- Remove private Storage metadata owned by the account before Auth deletion.
  delete from storage.objects
  where owner_id = target.id::text
     or name like target.id::text || '/%';

  delete from auth.users where id = target.id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'ACCOUNT_DELETED',
    'account',
    target.id::text,
    jsonb_build_object('role', target.role, 'email_sha256', encode(extensions.digest(lower(target.email), 'sha256'), 'hex'))
  );
end
$$;
revoke all on function public.admin_delete_account(uuid, text) from public, anon;
grant execute on function public.admin_delete_account(uuid, text) to authenticated;
