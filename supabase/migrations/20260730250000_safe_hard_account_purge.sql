begin;

-- Restore only relationships that were canonically cascading before the
-- incident migrations. The explicit allowlist avoids another schema-wide
-- rewrite while retaining the original child-lifecycle behavior.
do $body$
declare
  fk record;
  canonical_cascade_names constant text[] := array[
    'account_blocks_blocked_id_fkey',
    'account_blocks_blocker_id_fkey',
    'account_role_memberships_account_id_fkey',
    'account_session_roles_account_id_fkey',
    'addresses_account_id_fkey',
    'authentication_events_account_id_fkey',
    'booking_status_events_booking_id_fkey',
    'cancellations_booking_id_fkey',
    'cash_confirmations_payment_id_fkey',
    'conversation_participants_account_id_fkey',
    'conversation_participants_conversation_id_fkey',
    'conversation_reads_account_id_fkey',
    'conversation_reads_conversation_id_fkey',
    'favorites_user_account_id_fkey',
    'favorites_worker_account_id_fkey',
    'location_updates_booking_id_fkey',
    'match_candidates_service_request_id_fkey',
    'message_attachments_message_id_fkey',
    'message_translations_message_id_fkey',
    'messages_conversation_id_fkey',
    'notification_deliveries_campaign_id_fkey',
    'notification_deliveries_recipient_id_fkey',
    'notifications_recipient_id_fkey',
    'payout_methods_account_id_fkey',
    'request_bids_service_request_id_fkey',
    'request_media_service_request_id_fkey',
    'review_ai_insights_review_id_fkey',
    'review_media_review_id_fkey',
    'review_replies_review_id_fkey',
    'review_reports_review_id_fkey',
    'review_votes_account_id_fkey',
    'review_votes_review_id_fkey',
    'route_snapshots_booking_id_fkey',
    'support_attachments_support_message_id_fkey',
    'support_messages_ticket_id_fkey',
    'worker_availability_worker_id_fkey',
    'worker_offerings_worker_id_fkey',
    'worker_portfolio_media_worker_id_fkey',
    'worker_skills_worker_id_fkey',
    'worker_verifications_worker_id_fkey'
  ];
  definition text;
begin
  for fk in
    select
      con.conname,
      namespace.nspname as child_schema,
      relation.relname as child_table,
      pg_get_constraintdef(con.oid) as constraint_definition
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class relation on relation.oid = con.conrelid
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where con.contype = 'f'
      and namespace.nspname = 'public'
      and con.conname = any(canonical_cascade_names)
  loop
    definition := replace(
      fk.constraint_definition,
      'ON DELETE RESTRICT',
      'ON DELETE CASCADE'
    );
    if definition <> fk.constraint_definition then
      execute format(
        'alter table %I.%I drop constraint %I',
        fk.child_schema,
        fk.child_table,
        fk.conname
      );
      execute format(
        'alter table %I.%I add constraint %I %s',
        fk.child_schema,
        fk.child_table,
        fk.conname,
        definition
      );
    end if;
  end loop;
end
$body$;

create table if not exists private.account_purge_context (
  transaction_id bigint primary key
);
revoke all on private.account_purge_context from public, anon, authenticated;

create or replace function public.prevent_wallet_transaction_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and exists (
    select 1
    from private.account_purge_context context
    where context.transaction_id = txid_current()
  ) then
    return old;
  end if;
  raise exception using errcode = '42501', message = 'WALLET_TRANSACTIONS_ARE_APPEND_ONLY';
end;
$$;

do $body$
begin
  if to_regclass('public.wallet_transactions') is not null then
    execute 'drop trigger if exists wallet_transactions_append_only
             on public.wallet_transactions';
    execute 'create trigger wallet_transactions_append_only
             before delete or update on public.wallet_transactions
             for each row execute function public.prevent_wallet_transaction_mutation()';
  end if;
end
$body$;

select pgmq.create('account_storage_purges');

create or replace function private.collect_account_purge_rows(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fk record;
  key_pair record;
  join_clause text;
  added_rows integer;
  current_rows integer;
begin
  drop table if exists pg_temp.account_purge_rows;
  create temporary table account_purge_rows (
    table_oid oid not null,
    row_ctid tid not null,
    depth integer not null,
    primary key (table_oid, row_ctid)
  ) on commit drop;

  execute
    'insert into pg_temp.account_purge_rows(table_oid, row_ctid, depth)
     select ''public.accounts''::regclass::oid, account.ctid, 0
     from public.accounts account
     where account.id = $1'
  using p_account_id;

  -- Some application tables, such as customer_verifications, reference
  -- auth.users directly instead of public.accounts. Seed every such public
  -- child row so native Auth deletion and RPC deletion have identical scope.
  for fk in
    select
      constraint_row.conrelid as child_oid,
      constraint_row.confrelid as parent_oid,
      child_namespace.nspname as child_schema,
      child_relation.relname as child_table,
      parent_namespace.nspname as parent_schema,
      parent_relation.relname as parent_table,
      constraint_row.conkey as child_keys,
      constraint_row.confkey as parent_keys
    from pg_catalog.pg_constraint constraint_row
    join pg_catalog.pg_class child_relation
      on child_relation.oid = constraint_row.conrelid
    join pg_catalog.pg_namespace child_namespace
      on child_namespace.oid = child_relation.relnamespace
    join pg_catalog.pg_class parent_relation
      on parent_relation.oid = constraint_row.confrelid
    join pg_catalog.pg_namespace parent_namespace
      on parent_namespace.oid = parent_relation.relnamespace
    where constraint_row.contype = 'f'
      and child_namespace.nspname = 'public'
      and parent_namespace.nspname = 'auth'
      and parent_relation.relname = 'users'
  loop
    join_clause := '';
    for key_pair in
      select
        child_attribute.attname as child_column,
        parent_attribute.attname as parent_column
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
      if join_clause <> '' then
        join_clause := join_clause || ' and ';
      end if;
      join_clause := join_clause || format(
        'child.%I is not distinct from parent.%I',
        key_pair.child_column,
        key_pair.parent_column
      );
    end loop;

    execute format(
      'insert into pg_temp.account_purge_rows(table_oid, row_ctid, depth)
       select %L::oid, child.ctid, 1
       from %I.%I child
       join %I.%I parent on %s
       where parent.id = $1
       on conflict (table_oid, row_ctid) do nothing',
      fk.child_oid,
      fk.child_schema,
      fk.child_table,
      fk.parent_schema,
      fk.parent_table,
      join_clause
    ) using p_account_id;
  end loop;

  loop
    added_rows := 0;
    for fk in
      select
        constraint_row.conrelid as child_oid,
        constraint_row.confrelid as parent_oid,
        child_namespace.nspname as child_schema,
        child_relation.relname as child_table,
        parent_namespace.nspname as parent_schema,
        parent_relation.relname as parent_table,
        constraint_row.conkey as child_keys,
        constraint_row.confkey as parent_keys
      from pg_catalog.pg_constraint constraint_row
      join pg_catalog.pg_class child_relation
        on child_relation.oid = constraint_row.conrelid
      join pg_catalog.pg_namespace child_namespace
        on child_namespace.oid = child_relation.relnamespace
      join pg_catalog.pg_class parent_relation
        on parent_relation.oid = constraint_row.confrelid
      join pg_catalog.pg_namespace parent_namespace
        on parent_namespace.oid = parent_relation.relnamespace
      where constraint_row.contype = 'f'
        and child_namespace.nspname = 'public'
        and parent_namespace.nspname = 'public'
    loop
      join_clause := '';
      for key_pair in
        select
          child_attribute.attname as child_column,
          parent_attribute.attname as parent_column
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
        if join_clause <> '' then
          join_clause := join_clause || ' and ';
        end if;
        join_clause := join_clause || format(
          'child.%I is not distinct from parent.%I',
          key_pair.child_column,
          key_pair.parent_column
        );
      end loop;

      execute format(
        'insert into pg_temp.account_purge_rows(table_oid, row_ctid, depth)
         select %L::oid, child.ctid, max(parent_rows.depth) + 1
         from %I.%I child
         join %I.%I parent on %s
         join pg_temp.account_purge_rows parent_rows
           on parent_rows.table_oid = %L::oid
          and parent_rows.row_ctid = parent.ctid
         group by child.ctid
         on conflict (table_oid, row_ctid) do nothing',
        fk.child_oid,
        fk.child_schema,
        fk.child_table,
        fk.parent_schema,
        fk.parent_table,
        join_clause,
        fk.parent_oid
      );
      get diagnostics current_rows = row_count;
      added_rows := added_rows + current_rows;
    end loop;
    exit when added_rows = 0;
  end loop;
end;
$$;

create or replace function public.admin_preview_account_purge(p_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.accounts;
  table_counts jsonb;
  total_rows bigint;
  storage_files bigint;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select account.* into target
  from public.accounts account
  where account.id = p_account_id;

  if target.id is null then
    raise exception using errcode = 'P0002', message = 'ACCOUNT_NOT_FOUND';
  end if;
  if target.role = 'ADMIN' or target.is_protected then
    raise exception using errcode = '42501', message = 'ADMIN_ACCOUNT_DELETE_NOT_ALLOWED';
  end if;

  perform private.collect_account_purge_rows(target.id);

  execute
    'select
       coalesce(jsonb_object_agg(counts.table_name, counts.row_count), ''{}''::jsonb),
       coalesce(sum(counts.row_count), 0)
     from (
       select relation.relname as table_name, count(*) as row_count
       from pg_temp.account_purge_rows purge_row
       join pg_catalog.pg_class relation on relation.oid = purge_row.table_oid
       group by relation.relname
     ) counts'
  into table_counts, total_rows;

  select count(*) into storage_files
  from storage.objects object
  where object.owner_id::text = target.id::text
     or object.name like target.id::text || '/%';

  return jsonb_build_object(
    'account_id', target.id,
    'role', target.role,
    'total_rows', total_rows,
    'storage_files', storage_files,
    'tables', table_counts
  );
end;
$$;

create or replace function private.purge_account_before_auth_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.accounts;
  purge_row record;
  storage_group record;
  changed_rows integer;
  deleted_in_pass integer;
  remaining_rows integer;
begin
  select account.* into target
  from public.accounts account
  where account.id = old.id
  for update;

  if target.id is null then
    return old;
  end if;
  if target.role = 'ADMIN' or target.is_protected then
    raise exception using errcode = '42501', message = 'ADMIN_ACCOUNT_DELETE_NOT_ALLOWED';
  end if;
  if auth.uid() = target.id then
    raise exception using errcode = '42501', message = 'ACCOUNT_DELETE_NOT_ALLOWED';
  end if;

  perform private.collect_account_purge_rows(target.id);

  for storage_group in
    select object.bucket_id, jsonb_agg(object.name order by object.name) as paths
    from storage.objects object
    where object.owner_id::text = target.id::text
       or object.name like target.id::text || '/%'
    group by object.bucket_id
  loop
    perform pgmq.send(
      'account_storage_purges',
      jsonb_build_object(
        'account_id', target.id,
        'bucket_id', storage_group.bucket_id,
        'paths', storage_group.paths
      )
    );
  end loop;

  insert into private.account_purge_context(transaction_id)
  values (txid_current())
  on conflict (transaction_id) do nothing;

  begin
    loop
      deleted_in_pass := 0;
      for purge_row in execute
        'select
           rows.table_oid,
           rows.row_ctid,
           rows.depth,
           namespace.nspname as table_schema,
           relation.relname as table_name
         from pg_temp.account_purge_rows rows
         join pg_catalog.pg_class relation on relation.oid = rows.table_oid
         join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
         order by rows.depth desc'
      loop
        begin
          execute format(
            'delete from %I.%I where ctid = $1',
            purge_row.table_schema,
            purge_row.table_name
          ) using purge_row.row_ctid;
          get diagnostics changed_rows = row_count;
          execute
            'delete from pg_temp.account_purge_rows
             where table_oid = $1 and row_ctid = $2'
          using purge_row.table_oid, purge_row.row_ctid;
          deleted_in_pass := deleted_in_pass + greatest(changed_rows, 1);
        exception
          when foreign_key_violation then
            null;
        end;
      end loop;

      execute 'select count(*) from pg_temp.account_purge_rows'
      into remaining_rows;
      exit when remaining_rows = 0;
      if deleted_in_pass = 0 then
        raise exception using
          errcode = '23503',
          message = 'ACCOUNT_PURGE_DEPENDENCY_CYCLE',
          detail = 'The purge dependency graph contains an unresolved foreign-key cycle.';
      end if;
    end loop;

    delete from private.account_purge_context
    where transaction_id = txid_current();
  exception
    when others then
      delete from private.account_purge_context
      where transaction_id = txid_current();
      raise;
  end;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    case when auth.uid() = target.id then null else auth.uid() end,
    'ACCOUNT_DELETED',
    'account',
    target.id::text,
    jsonb_build_object(
      'role', target.role,
      'source', case when auth.uid() is null then 'SUPABASE_AUTH_ADMIN' else 'AYOS_ADMIN' end,
      'email_sha256',
      encode(extensions.digest(lower(target.email), 'sha256'), 'hex')
    )
  );

  return old;
end;
$$;

drop trigger if exists purge_account_before_auth_delete on auth.users;
create trigger purge_account_before_auth_delete
before delete on auth.users
for each row execute function private.purge_account_before_auth_delete();

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
  if lower(btrim(coalesce(p_confirmation_email, ''))) <> lower(target.email) then
    raise exception using errcode = '22023', message = 'ACCOUNT_DELETE_CONFIRMATION_MISMATCH';
  end if;

  delete from auth.users where id = target.id;
  if not found then
    raise exception using errcode = 'P0002', message = 'ACCOUNT_NOT_FOUND';
  end if;
end;
$$;

revoke all on function private.collect_account_purge_rows(uuid) from public;
revoke all on function private.purge_account_before_auth_delete() from public;
revoke all on function public.admin_preview_account_purge(uuid) from public, anon;
revoke all on function public.admin_delete_account(uuid, text) from public, anon;
grant execute on function public.admin_preview_account_purge(uuid) to authenticated;
grant execute on function public.admin_delete_account(uuid, text) to authenticated;

notify pgrst, 'reload schema';
notify pgrst, 'reload config';

commit;
