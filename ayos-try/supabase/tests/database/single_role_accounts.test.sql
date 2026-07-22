begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

select hasnt_function('public','enable_secondary_role',array['account_role'],'secondary-role RPC is absent');
select hasnt_function('public','switch_active_role',array['account_role'],'role-switch RPC is absent');
select hasnt_function('public','get_my_role_context',array[]::text[],'multi-role context RPC is absent');

select lives_ok($$
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values
    ('00000000-0000-0000-0000-000000000000','91000000-0000-0000-0000-000000000001','authenticated','authenticated','role-user@example.test','',now(),'{}','{"role":"USER","name":"Role User"}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','92000000-0000-0000-0000-000000000001','authenticated','authenticated','role-worker@example.test','',now(),'{}','{"role":"WORKER","name":"Role Worker"}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','93000000-0000-0000-0000-000000000001','authenticated','authenticated','google-customer@example.test','',now(),'{"provider":"google"}','{"role":"WORKER","full_name":"Google Customer"}',now(),now())
$$,'primary-role accounts can be provisioned');

select is((select role::text from public.accounts where id='93000000-0000-0000-0000-000000000001'),'USER','Google metadata cannot provision a Worker');
select ok(exists(select 1 from public.user_profiles where account_id='93000000-0000-0000-0000-000000000001'),'Google account receives a User profile');
select ok(not exists(select 1 from public.worker_profiles where account_id='93000000-0000-0000-0000-000000000001'),'Google account receives no Worker profile');

insert into public.worker_profiles(account_id,display_name) values('91000000-0000-0000-0000-000000000001','Historical Worker');
insert into public.user_profiles(account_id,display_name) values('92000000-0000-0000-0000-000000000001','Historical User');
insert into public.account_role_memberships(account_id,role,status,revoked_at) values
  ('91000000-0000-0000-0000-000000000001','WORKER','REVOKED',now()),
  ('92000000-0000-0000-0000-000000000001','USER','REVOKED',now());

select is((select count(*) from public.worker_profiles where account_id='91000000-0000-0000-0000-000000000001') + (select count(*) from public.user_profiles where account_id='92000000-0000-0000-0000-000000000001'),2::bigint,'historical secondary profiles are preserved');
select is((select count(*) from public.account_role_memberships where status='REVOKED' and account_id in ('91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001')),2::bigint,'historical secondary memberships remain revoked');
select throws_ok(
  $$update public.account_role_memberships set status='ACTIVE',revoked_at=null where account_id='91000000-0000-0000-0000-000000000001' and role='WORKER'$$,
  '42501','SECONDARY_ROLES_DISABLED','a secondary membership cannot be reactivated'
);

select set_config('request.jwt.claims','{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","session_id":"role-user-session"}',true);
select is(public.current_role()::text,'USER','User current role is always the primary role');
select is(public.get_my_profile()->>'active_role','USER','User profile response exposes only the primary role');
select is(public.get_my_profile()->'profile'->>'display_name','Role User','dormant Worker profile cannot replace the User profile');
select throws_ok(
  $$select public.submit_worker_application('{}'::jsonb,array[]::text[],'bio','experience')$$,
  '42501','WORKER_ROLE_REQUIRED','User cannot submit a Worker application through a historical profile'
);
select throws_ok(
  $$insert into public.account_session_roles(session_id,account_id,active_role) values('role-user-session','91000000-0000-0000-0000-000000000001','WORKER')$$,
  '42501','ROLE_SWITCHING_DISABLED','session role selections are rejected'
);

select set_config('request.jwt.claims','{"sub":"92000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","session_id":"role-worker-session"}',true);
select is(public.current_role()::text,'WORKER','Worker current role is always the primary role');
select is(public.get_my_profile()->'profile'->>'display_name','Role Worker','dormant User profile cannot replace the Worker profile');
select ok(position('account_session_roles' in pg_get_functiondef('public.current_role()'::regprocedure))=0,'current role does not read session-role records');
select is((select count(*) from public.account_session_roles),0::bigint,'obsolete session-role selections are cleared');

select * from finish();
rollback;
