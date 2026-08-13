-- Harden the hard-account-purge against rows committed by background writers
-- during the purge window, and cascade the last RESTRICT account-owned FK.
--
-- Root cause of the original ACCOUNT_PURGE_DEPENDENCY_CYCLE: the purge runs in
-- READ COMMITTED, so each DELETE statement in the purge loop takes a fresh
-- snapshot. The background AI pipeline commits ai_analysis_attempts rows for the
-- account between collection and the accounts-row delete, so the accounts delete
-- fails with an FK violation and the loop deadlocks. 20260812000000 neutralized
-- that for the AI tables by cascading them off accounts. This migration:
--   1. re-collects the purge set (sweeping rows committed mid-purge) a bounded
--      number of times before declaring a dependency cycle;
--   2. cascades route_snapshots.requested_by, the last RESTRICT account-owned
--      FK outside the AI set.
begin;

-- 1. Defensive re-collect in the purge loop.
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
  re_collects integer := 0;
  max_re_collects constant integer := 3;
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
        -- Rows committed by background writers after collection (READ COMMITTED)
        -- can block the remaining delete. Sweep them in with a fresh collect
        -- before declaring a dependency cycle.
        if re_collects < max_re_collects then
          re_collects := re_collects + 1;
          perform private.collect_account_purge_rows(target.id);
          continue;
        end if;
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

-- 2. Cascade the last RESTRICT account-owned FK outside the AI set.
alter table public.route_snapshots
  drop constraint if exists route_snapshots_requested_by_fkey;
alter table public.route_snapshots
  add constraint route_snapshots_requested_by_fkey
  foreign key (requested_by) references public.accounts(id) on delete cascade;

notify pgrst, 'reload schema';
notify pgrst, 'reload config';

commit;
