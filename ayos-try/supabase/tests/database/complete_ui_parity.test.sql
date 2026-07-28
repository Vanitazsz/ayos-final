begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

select has_table('public','service_templates','service templates are persisted');
select has_column('public','service_templates','archived_at','service templates support recoverable archive');
select ok((select relrowsecurity from pg_class where oid='public.service_templates'::regclass),'service template RLS is enabled');
select has_function('public','admin_upsert_service_template',array['uuid','uuid','text','text','numeric','integer','boolean'],'service template upsert exists');
select has_function('public','admin_duplicate_service_template',array['uuid'],'service template duplicate exists');
select has_function('public','admin_archive_service_template',array['uuid'],'service template archive exists');
select has_function('public','restore_all_from_trash',array[]::text[],'restore-all command exists');
select has_function('public','permanently_delete',array['uuid','text'],'typed permanent deletion exists');
select has_function('public','empty_trash',array['text'],'typed empty-trash command exists');
select has_trigger('auth','users','normalize_google_signup_metadata','Google accounts receive safe User metadata');
select is(has_function_privilege('anon','public.admin_upsert_service_template(uuid,uuid,text,text,numeric,integer,boolean)','execute'),false,'anonymous cannot mutate service templates');
select is(has_function_privilege('anon','public.permanently_delete(uuid,text)','execute'),false,'anonymous cannot delete Trash records');

insert into private.admin_bootstrap_requests(email, token_hash, display_name, expires_at)
values ('ui-admin@example.test', encode(extensions.digest('ui-admin-token','sha256'),'hex'), 'UI Admin', now() + interval '5 minutes');
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values (
  '00000000-0000-0000-0000-000000000000','71000000-0000-0000-0000-000000000001','authenticated','authenticated',
  'ui-admin@example.test','',now(),'{}','{"admin_bootstrap_token":"ui-admin-token"}',now(),now()
);
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values (
  '00000000-0000-0000-0000-000000000000','72000000-0000-0000-0000-000000000001','authenticated','authenticated',
  'ui-user@example.test','',now(),'{}','{"role":"USER","name":"UI User"}',now(),now()
);
insert into public.service_categories(id,name,description,is_active)
values ('73000000-0000-0000-0000-000000000001','UI Test Category','Parity test category',true);
update public.accounts set mfa_enabled = true where id = '71000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claims','{"sub":"72000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',true);
set local role authenticated;
select throws_ok(
  $$select public.admin_upsert_service_template(null,'73000000-0000-0000-0000-000000000001','User service','',100,60,true)$$,
  '42501','AAL2_ADMIN_REQUIRED','ordinary users cannot mutate templates'
);

reset role;
select set_config('request.jwt.claims','{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select throws_ok(
  $$select public.admin_upsert_service_template(null,'73000000-0000-0000-0000-000000000001','Admin service','',100,60,true)$$,
  '42501','AAL2_ADMIN_REQUIRED','AAL1 administrators cannot mutate templates'
);

reset role;
select set_config('request.jwt.claims','{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',true);
set local role authenticated;
select lives_ok(
  $$select public.admin_upsert_service_template(null,'73000000-0000-0000-0000-000000000001','Admin service','Live service',1250,120,true)$$,
  'AAL2 administrator can create a template'
);
select is((select count(*) from public.service_templates where name='Admin service'),1::bigint,'created template is persisted');
select lives_ok(
  $$select public.admin_duplicate_service_template((select id from public.service_templates where name='Admin service'))$$,
  'template can be duplicated'
);
select is((select count(*) from public.service_templates where category_id='73000000-0000-0000-0000-000000000001'),2::bigint,'duplicate is persisted');
select lives_ok(
  $$select public.admin_archive_service_template((select id from public.service_templates where name like 'Admin service (Copy%'))$$,
  'duplicate can be archived'
);
select is((select count(*) from public.trash_entries where entity_type='service_template' and restored_at is null),1::bigint,'archive creates an active Trash entry');
select throws_ok(
  $$select public.permanently_delete((select id from public.trash_entries where entity_type='service_template' and restored_at is null),'wrong')$$,
  '22023','DELETE_CONFIRMATION_MISMATCH','permanent deletion requires exact confirmation'
);
select lives_ok(
  $$select public.restore_from_trash((select id from public.trash_entries where entity_type='service_template' and restored_at is null))$$,
  'archived template can be restored'
);
select lives_ok(
  $$select public.admin_archive_service_template((select id from public.service_templates where name like 'Admin service (Copy%'))$$,
  'restored template can be archived again'
);
select lives_ok(
  $$select public.permanently_delete(
    (select id from public.trash_entries where entity_type='service_template' and restored_at is null order by deleted_at desc limit 1),
    'DELETE ' || (select entity_id from public.trash_entries where entity_type='service_template' and restored_at is null order by deleted_at desc limit 1)
  )$$,
  'typed permanent deletion removes an allowlisted template'
);
select is((select count(*) from public.service_templates where category_id='73000000-0000-0000-0000-000000000001'),1::bigint,'permanent deletion leaves the original template');
select ok((select count(*) from public.audit_logs where action in ('SERVICE_TEMPLATE_UPSERTED','SERVICE_TEMPLATE_DUPLICATED','SERVICE_TEMPLATE_ARCHIVED','PERMANENTLY_DELETED')) >= 4,'service operations are audited');

reset role;
select * from finish();
rollback;
