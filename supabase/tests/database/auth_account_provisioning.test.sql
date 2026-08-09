begin;

select plan(8);

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

select lives_ok(
  $$insert into auth.users(
    instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    '97000000-0000-0000-0000-000000000004',
    'authenticated','authenticated','first-mobile-customer@example.test','',now(),'{}',
    '{"role":"USER","name":"First Mobile Customer","mobile":"09171234567"}',now(),now()
  )$$,
  'first registration with a mobile number succeeds'
);

select throws_ok(
  $$insert into auth.users(
    instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    '97000000-0000-0000-0000-000000000005',
    'authenticated','authenticated','second-mobile-customer@example.test','',now(),'{}',
    '{"role":"USER","name":"Second Mobile Customer","mobile":"+639171234567"}',now(),now()
  )$$,
  'P0001',
  'MOBILE_ALREADY_REGISTERED',
  'registering an already-used mobile number fails with a named error'
);

select is(
  (select count(*)::int from public.accounts where mobile = '+639171234567'),
  1,
  'the duplicate registration leaves no second account behind'
);

select * from finish();
rollback;
