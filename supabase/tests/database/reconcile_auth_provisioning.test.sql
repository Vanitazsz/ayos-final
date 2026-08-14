begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select has_function('public','reconcile_unprovisioned_accounts','back-fill RPC exists');

-- Simulate the hosted drift: the provisioning trigger is missing, so a new
-- identity gets no application account.
drop trigger provision_account_after_auth_insert on auth.users;

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
  ('00000000-0000-0000-0000-000000000000','94000000-0000-0000-0000-000000000050','authenticated','authenticated','backfill-worker@example.test','',now(),'{}','{"role":"WORKER","name":"Backfill Worker","mobile":"09171234567"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','94000000-0000-0000-0000-000000000051','authenticated','authenticated','backfill-user@example.test','',now(),'{}','{"role":"USER","name":"Backfill User","mobile":"not-a-number"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','94000000-0000-0000-0000-000000000052','authenticated','authenticated','backfill-invalid@example.test','',now(),'{}','{"role":"INVALID","name":"X"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','94000000-0000-0000-0000-000000000054','authenticated','authenticated',null,'',now(),'{}','{"role":"WORKER","name":"No Email Worker"}',now(),now());

select is(
  (select count(*) from public.accounts where id='94000000-0000-0000-0000-000000000050'),
  0::bigint,
  'identity without the provisioning trigger has no account'
);

select is(
  (select public.reconcile_unprovisioned_accounts()),
  2::bigint,
  'back-fill provisions every identity with a recognized role'
);

select is(
  (select count(*) from public.accounts where id='94000000-0000-0000-0000-000000000050'),
  1::bigint,
  'back-fill creates the worker account'
);
select is(
  (select status from public.accounts where id='94000000-0000-0000-0000-000000000050'),
  'ACTIVE'::public.account_status,
  'a confirmed identity is back-filled as ACTIVE'
);
select is(
  (select count(*) from public.worker_profiles where account_id='94000000-0000-0000-0000-000000000050'),
  1::bigint,
  'back-fill creates the worker profile'
);
select is(
  (select mobile from public.accounts where id='94000000-0000-0000-0000-000000000050'),
  '+639171234567',
  'back-fill normalizes a Philippine mobile number'
);
select is(
  (select count(*) from public.accounts where id='94000000-0000-0000-0000-000000000051'),
  1::bigint,
  'back-fill provisions a user identity'
);
select is(
  (select mobile from public.accounts where id='94000000-0000-0000-0000-000000000051'),
  null,
  'an invalid mobile is stored as null instead of failing'
);
select is(
  (select count(*) from public.accounts where id='94000000-0000-0000-0000-000000000052'),
  0::bigint,
  'an identity with an unrecognized role is skipped'
);
select is(
  (select count(*) from public.accounts where id='94000000-0000-0000-0000-000000000054'),
  0::bigint,
  'an identity without an email is skipped'
);

-- The re-asserted trigger provisions new signups again.
create trigger provision_account_after_auth_insert
after insert on auth.users
for each row execute function public.provision_account();

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','94000000-0000-0000-0000-000000000053','authenticated','authenticated','provisioned-worker@example.test','',now(),'{}','{"role":"WORKER","name":"Provisioned Worker"}',now(),now());

select is(
  (select count(*) from public.accounts where id='94000000-0000-0000-0000-000000000053'),
  1::bigint,
  'the restored trigger provisions new identities'
);
select is(
  (select count(*) from public.worker_profiles where account_id='94000000-0000-0000-0000-000000000053'),
  1::bigint,
  'the restored trigger creates the matching profile'
);

select * from finish();
rollback;
