begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

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
  ('00000000-0000-0000-0000-000000000000','64000000-0000-0000-0000-000000000001','authenticated','authenticated','retained-user@example.test','',now(),'{}','{"role":"USER","name":"Retained User"}',now(),now());

insert into public.ai_analyses(account_id, input_type, provider)
values ('64000000-0000-0000-0000-000000000001', 'TEXT', 'OPENAI');

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

set local role authenticated;
select lives_ok(
  $$select public.admin_delete_account('63000000-0000-0000-0000-000000000001', 'delete-worker@example.test')$$,
  'confirmed Worker deletion succeeds'
);
reset role;
select is((select count(*) from auth.users where id = '63000000-0000-0000-0000-000000000001'), 0::bigint, 'Worker Auth identity is deleted');
select is((select count(*) from public.accounts where id = '63000000-0000-0000-0000-000000000001'), 0::bigint, 'Worker account is deleted');
select is((select count(*) from public.worker_profiles where account_id = '63000000-0000-0000-0000-000000000001'), 0::bigint, 'Worker profile is deleted');

set local role authenticated;
select throws_ok(
  $$select public.admin_delete_account('64000000-0000-0000-0000-000000000001', 'retained-user@example.test')$$,
  '23503',
  'ACCOUNT_DELETE_BLOCKED_BY_RELATED_RECORDS',
  'retained business records block deletion'
);
reset role;
select ok(exists(select 1 from auth.users where id = '64000000-0000-0000-0000-000000000001'), 'blocked deletion preserves Auth identity');
select ok(exists(select 1 from public.accounts where id = '64000000-0000-0000-0000-000000000001'), 'blocked deletion preserves account');
select ok(exists(select 1 from public.user_profiles where account_id = '64000000-0000-0000-0000-000000000001'), 'blocked deletion preserves profile');
select ok(exists(select 1 from public.ai_analyses where account_id = '64000000-0000-0000-0000-000000000001'), 'blocked deletion preserves retained records');

reset role;
select * from finish();
rollback;
