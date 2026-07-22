begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

select has_table('private','admin_bootstrap_requests','private bootstrap request table exists');
select has_function('public','prepare_admin_bootstrap',array['text','text','text','timestamp with time zone'],'prepare RPC exists');
select has_function('public','cancel_admin_bootstrap',array['text','text'],'cancel RPC exists');
select has_function('public','admin_bootstrap_status',array['text'],'status RPC exists');
select ok(has_function_privilege('service_role','public.prepare_admin_bootstrap(text,text,text,timestamptz)','execute'),'service role can prepare bootstrap');
select is(has_function_privilege('authenticated','public.prepare_admin_bootstrap(text,text,text,timestamptz)','execute'),false,'authenticated cannot prepare bootstrap');

select lives_ok($$
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000001','authenticated','authenticated','bootstrap-user@example.test','',now(),'{}','{"role":"USER","name":"Bootstrap User"}',now(),now())
$$,'ordinary User registration succeeds');
select is((select role::text from public.accounts where id='10000000-0000-0000-0000-000000000001'),'USER','User account role is preserved');
select ok(exists(select 1 from public.user_profiles where account_id='10000000-0000-0000-0000-000000000001'),'User profile is provisioned');

select lives_ok($$
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000','20000000-0000-0000-0000-000000000001','authenticated','authenticated','bootstrap-worker@example.test','',now(),'{}','{"role":"WORKER","name":"Bootstrap Worker"}',now(),now())
$$,'ordinary Worker registration succeeds');
select is((select role::text from public.accounts where id='20000000-0000-0000-0000-000000000001'),'WORKER','Worker account role is preserved');
select ok(exists(select 1 from public.worker_profiles where account_id='20000000-0000-0000-0000-000000000001'),'Worker profile is provisioned');

select throws_ok($$
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000','30000000-0000-0000-0000-000000000001','authenticated','authenticated','dashboard-user@example.test','',now(),'{}','{}',now(),now())
$$,'42501','Invalid account role','Dashboard-style creation without role fails');
select throws_ok($$
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000','30000000-0000-0000-0000-000000000002','authenticated','authenticated','self-admin@example.test','',now(),'{"ayos_role":"ADMIN"}','{"role":"ADMIN","name":"Self Admin"}',now(),now())
$$,'42501','Administrator self-registration is prohibited','Administrator metadata without a ticket fails');

insert into private.admin_bootstrap_requests(email,token_hash,display_name,created_at,expires_at)
values('expired-admin@example.test',encode(extensions.digest('expired-token','sha256'),'hex'),'Expired Admin',now()-interval '20 minutes',now()-interval '10 minutes');
select throws_ok($$
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000','30000000-0000-0000-0000-000000000003','authenticated','authenticated','expired-admin@example.test','',now(),'{}','{"admin_bootstrap_token":"expired-token"}',now(),now())
$$,'42501','Invalid account role','Expired ticket fails');
select is((select count(*) from private.admin_bootstrap_requests where email='expired-admin@example.test'),1::bigint,'Expired failed ticket is not consumed');

insert into private.admin_bootstrap_requests(email,token_hash,display_name,expires_at)
values('wrong-token-admin@example.test',encode(extensions.digest('correct-token','sha256'),'hex'),'Wrong Token Admin',now()+interval '5 minutes');
select throws_ok($$
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000','30000000-0000-0000-0000-000000000004','authenticated','authenticated','wrong-token-admin@example.test','',now(),'{}','{"admin_bootstrap_token":"wrong-token"}',now(),now())
$$,'42501','Invalid account role','Wrong bootstrap token fails');
select is((select count(*) from private.admin_bootstrap_requests where email='wrong-token-admin@example.test'),1::bigint,'Wrong-token ticket is not consumed');

insert into private.admin_bootstrap_requests(email,token_hash,display_name,expires_at)
values('valid-admin@example.test',encode(extensions.digest('valid-token','sha256'),'hex'),'Valid Admin',now()+interval '5 minutes');
select lives_ok($$
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000','40000000-0000-0000-0000-000000000001','authenticated','authenticated','valid-admin@example.test','',now(),'{}','{"admin_bootstrap_token":"valid-token"}',now(),now())
$$,'Valid one-time administrator ticket succeeds');
select ok((select role='ADMIN' and status='ACTIVE' and is_protected from public.accounts where id='40000000-0000-0000-0000-000000000001'),'Administrator account is active and protected');
select ok(exists(select 1 from public.admin_profiles where account_id='40000000-0000-0000-0000-000000000001'),'Administrator profile is provisioned');
select is((select count(*) from private.admin_bootstrap_requests where email='valid-admin@example.test'),0::bigint,'Successful ticket is consumed');

select throws_ok($$
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000','40000000-0000-0000-0000-000000000002','authenticated','authenticated','replay-admin@example.test','',now(),'{}','{"admin_bootstrap_token":"valid-token"}',now(),now())
$$,'42501','Invalid account role','Consumed token cannot be replayed for another administrator');

create function pg_temp.reject_admin_profile() returns trigger language plpgsql as $$
begin raise exception using errcode='P0001',message='TEST_ADMIN_PROFILE_FAILURE'; end
$$;
create trigger reject_admin_profile before insert on public.admin_profiles
for each row execute function pg_temp.reject_admin_profile();
insert into private.admin_bootstrap_requests(email,token_hash,display_name,expires_at)
values('recoverable-admin@example.test',encode(extensions.digest('recoverable-token','sha256'),'hex'),'Recoverable Admin',now()+interval '5 minutes');
select throws_ok($$
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000','50000000-0000-0000-0000-000000000001','authenticated','authenticated','recoverable-admin@example.test','',now(),'{}','{"admin_bootstrap_token":"recoverable-token"}',now(),now())
$$,'P0001','TEST_ADMIN_PROFILE_FAILURE','Failed profile insertion rolls back administrator creation');
select is((select count(*) from private.admin_bootstrap_requests where email='recoverable-admin@example.test'),1::bigint,'Failed insertion does not consume its ticket');
drop trigger reject_admin_profile on public.admin_profiles;
select lives_ok($$
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000','50000000-0000-0000-0000-000000000001','authenticated','authenticated','recoverable-admin@example.test','',now(),'{}','{"admin_bootstrap_token":"recoverable-token"}',now(),now())
$$,'Ticket remains usable after the failed transaction is corrected');
select is((select count(*) from private.admin_bootstrap_requests where email='recoverable-admin@example.test'),0::bigint,'Recovered successful insertion consumes its ticket');
select ok(exists(select 1 from public.accounts where id='50000000-0000-0000-0000-000000000001' and role='ADMIN' and is_protected),'Recovered administrator is protected');

select * from finish();
rollback;
