begin;

select plan(5);

select ok(
  exists (
    select 1
    from pg_trigger trigger_row
    join pg_class table_row on table_row.oid = trigger_row.tgrelid
    join pg_proc function_row on function_row.oid = trigger_row.tgfoid
    join pg_namespace schema_row on schema_row.oid = function_row.pronamespace
    where table_row.relnamespace = 'auth'::regnamespace
      and table_row.relname = 'users'
      and not trigger_row.tgisinternal
      and trigger_row.tgenabled <> 'D'
      and function_row.proname = 'provision_account'
      and schema_row.nspname = 'public'
  ),
  'Auth user inserts provision an application account'
);

select ok(
  exists (
    select 1
    from pg_trigger trigger_row
    join pg_class table_row on table_row.oid = trigger_row.tgrelid
    join pg_proc function_row on function_row.oid = trigger_row.tgfoid
    join pg_namespace schema_row on schema_row.oid = function_row.pronamespace
    where table_row.relnamespace = 'auth'::regnamespace
      and table_row.relname = 'users'
      and not trigger_row.tgisinternal
      and trigger_row.tgenabled <> 'D'
      and function_row.proname = 'activate_confirmed_account'
      and schema_row.nspname = 'public'
  ),
  'Email confirmation activates the application account'
);

select ok(
  exists (select 1 from pg_constraint where conname = 'accounts_id_fkey'),
  'Application accounts remain linked to Auth users'
);

select ok(
  exists (select 1 from pg_constraint where conname = 'user_profiles_account_id_fkey'),
  'Customer profiles remain linked to application accounts'
);

select ok(
  exists (select 1 from pg_constraint where conname = 'worker_profiles_account_id_fkey'),
  'Worker profiles remain linked to application accounts'
);

select * from finish();
rollback;
