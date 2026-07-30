begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

select has_function(
  'public',
  'admin_delete_account',
  array['uuid', 'text'],
  'administrator account deletion RPC exists'
);
select ok(
  has_function_privilege('authenticated', 'public.admin_delete_account(uuid,text)', 'execute'),
  'authenticated administrators can invoke the guarded RPC'
);
select is(
  has_function_privilege('anon', 'public.admin_delete_account(uuid,text)', 'execute'),
  false,
  'anonymous callers cannot invoke account deletion'
);
select has_function(
  'public',
  'admin_preview_account_purge',
  array['uuid'],
  'administrator purge preview exists'
);

insert into private.admin_bootstrap_requests(email, token_hash, display_name, expires_at)
values (
  'delete-admin@example.test',
  encode(extensions.digest('delete-admin-token', 'sha256'), 'hex'),
  'Delete Admin',
  now() + interval '5 minutes'
);
insert into auth.users(
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '61000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'delete-admin@example.test', '', now(), '{}',
  '{"admin_bootstrap_token":"delete-admin-token"}', now(), now()
);

insert into auth.users(
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000','62000000-0000-0000-0000-000000000001','authenticated','authenticated','delete-user@example.test','',now(),'{}','{"role":"USER","name":"Delete User"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','63000000-0000-0000-0000-000000000001','authenticated','authenticated','delete-worker@example.test','',now(),'{}','{"role":"WORKER","name":"Delete Worker"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','64000000-0000-0000-0000-000000000001','authenticated','authenticated','retained-user@example.test','',now(),'{}','{"role":"USER","name":"Retained User"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','65000000-0000-0000-0000-000000000001','authenticated','authenticated','counterpart-worker@example.test','',now(),'{}','{"role":"WORKER","name":"Counterpart Worker"}',now(),now());

insert into public.accounts(id, role, status, email, is_protected)
values
  ('61000000-0000-0000-0000-000000000001', 'ADMIN', 'ACTIVE', 'delete-admin@example.test', true),
  ('62000000-0000-0000-0000-000000000001', 'USER', 'ACTIVE', 'delete-user@example.test', false),
  ('63000000-0000-0000-0000-000000000001', 'WORKER', 'ACTIVE', 'delete-worker@example.test', false),
  ('64000000-0000-0000-0000-000000000001', 'USER', 'ACTIVE', 'retained-user@example.test', false),
  ('65000000-0000-0000-0000-000000000001', 'WORKER', 'ACTIVE', 'counterpart-worker@example.test', false)
on conflict (id) do nothing;
insert into public.user_profiles(account_id, display_name)
values
  ('62000000-0000-0000-0000-000000000001', 'Delete User'),
  ('64000000-0000-0000-0000-000000000001', 'Retained User')
on conflict (account_id) do nothing;
insert into public.worker_profiles(account_id, display_name)
values
  ('63000000-0000-0000-0000-000000000001', 'Delete Worker'),
  ('65000000-0000-0000-0000-000000000001', 'Counterpart Worker')
on conflict (account_id) do nothing;

insert into public.ai_analyses(account_id, input_type, provider)
values ('64000000-0000-0000-0000-000000000001', 'TEXT', 'OPENAI');
insert into public.favorites(user_account_id, worker_account_id)
values (
  '62000000-0000-0000-0000-000000000001',
  '65000000-0000-0000-0000-000000000001'
);
insert into storage.buckets(id, name, public)
values ('account-purge-test', 'account-purge-test', false)
on conflict (id) do nothing;
insert into storage.objects(bucket_id, name, owner_id)
values (
  'account-purge-test',
  '62000000-0000-0000-0000-000000000001/avatar.png',
  '62000000-0000-0000-0000-000000000001'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.admin_delete_account('62000000-0000-0000-0000-000000000001', 'wrong@example.test')$$,
  '22023',
  'ACCOUNT_DELETE_CONFIRMATION_MISMATCH',
  'confirmation email must match'
);
select ok(
  exists(select 1 from public.accounts where id = '62000000-0000-0000-0000-000000000001'),
  'confirmation failure preserves the account'
);
select is(
  (public.admin_preview_account_purge('62000000-0000-0000-0000-000000000001')->>'storage_files')::bigint,
  1::bigint,
  'purge preview counts owned Storage objects'
);

select throws_ok(
  $$select public.admin_delete_account('61000000-0000-0000-0000-000000000001', 'delete-admin@example.test')$$,
  '42501',
  'ACCOUNT_DELETE_NOT_ALLOWED',
  'administrator cannot delete the current account'
);
select ok(
  exists(select 1 from public.accounts where id = '61000000-0000-0000-0000-000000000001'),
  'protected administrator remains present'
);

select lives_ok(
  $$select public.admin_delete_account('62000000-0000-0000-0000-000000000001', 'DELETE-USER@EXAMPLE.TEST')$$,
  'confirmed User deletion succeeds case-insensitively'
);
reset role;
select is((select count(*) from auth.users where id = '62000000-0000-0000-0000-000000000001'), 0::bigint, 'User Auth identity is deleted');
select is((select count(*) from public.accounts where id = '62000000-0000-0000-0000-000000000001'), 0::bigint, 'User account is deleted');
select is((select count(*) from public.user_profiles where account_id = '62000000-0000-0000-0000-000000000001'), 0::bigint, 'User profile is deleted');
select is((select count(*) from public.favorites where user_account_id = '62000000-0000-0000-0000-000000000001'), 0::bigint, 'shared child record is deleted');
select is((select count(*) from public.accounts where id = '65000000-0000-0000-0000-000000000001'), 1::bigint, 'counterpart account remains intact');
select is(
  (
    select count(*)
    from pgmq.q_account_storage_purges
    where message->>'account_id' = '62000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'owned Storage cleanup is queued'
);

reset role;
select lives_ok(
  $$delete from auth.users where id = '63000000-0000-0000-0000-000000000001'$$,
  'native Auth deletion uses the scoped purge trigger'
);
select is((select count(*) from auth.users where id = '63000000-0000-0000-0000-000000000001'), 0::bigint, 'Worker Auth identity is deleted');
select is((select count(*) from public.accounts where id = '63000000-0000-0000-0000-000000000001'), 0::bigint, 'Worker account is deleted');
select is((select count(*) from public.worker_profiles where account_id = '63000000-0000-0000-0000-000000000001'), 0::bigint, 'Worker profile is deleted');

set local role authenticated;
select cmp_ok(
  (public.admin_preview_account_purge('64000000-0000-0000-0000-000000000001')->>'total_rows')::bigint,
  '>=',
  4::bigint,
  'purge preview counts the account, profile, and retained records'
);
select lives_ok(
  $$select public.admin_delete_account('64000000-0000-0000-0000-000000000001', 'retained-user@example.test')$$,
  'retained business records are purged transactionally'
);
reset role;
select is((select count(*) from auth.users where id = '64000000-0000-0000-0000-000000000001'), 0::bigint, 'retained User Auth identity is deleted');
select is((select count(*) from public.accounts where id = '64000000-0000-0000-0000-000000000001'), 0::bigint, 'retained User account is deleted');
select is((select count(*) from public.user_profiles where account_id = '64000000-0000-0000-0000-000000000001'), 0::bigint, 'retained User profile is deleted');
select is((select count(*) from public.ai_analyses where account_id = '64000000-0000-0000-0000-000000000001'), 0::bigint, 'retained dependent records are deleted');

reset role;
select * from finish();
rollback;
