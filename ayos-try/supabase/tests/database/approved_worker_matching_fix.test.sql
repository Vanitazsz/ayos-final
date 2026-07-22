begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select has_function(
  'public',
  'save_my_worker_matching_setup',
  array['numeric','numeric','integer','text','jsonb','boolean'],
  'worker matching setup RPC exists'
);
select has_function(
  'public',
  'get_my_worker_matching_readiness',
  array[]::text[],
  'worker readiness RPC exists'
);
select has_function(
  'public',
  'get_match_diagnostics',
  array['uuid'],
  'request-owner diagnostic RPC exists'
);

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '98000000-0000-0000-0000-000000000001',
    'authenticated','authenticated','matching-customer@example.test','',now(),'{}',
    '{"role":"USER","name":"Matching Customer"}',now(),now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '98000000-0000-0000-0000-000000000002',
    'authenticated','authenticated','matching-worker@example.test','',now(),'{}',
    '{"role":"WORKER","name":"Matching Worker"}',now(),now()
  );

select lives_ok(
  $$insert into public.worker_profiles(account_id,display_name)
    values('98000000-0000-0000-0000-000000000001','Invalid Worker Profile')$$,
  'legacy mismatched profile data can remain dormant during reconciliation'
);

insert into public.worker_skills(worker_id,category_id,years)
select
  '98000000-0000-0000-0000-000000000002',
  category.id,
  3
from public.service_categories category
where category.name = 'Plumbing';

insert into public.addresses(
  id,account_id,label,line1,barangay,city,province,is_default,location
)
values (
  '98000000-0000-0000-0000-000000000003',
  '98000000-0000-0000-0000-000000000001',
  'Home','Sapphire Avenue','Inocencio','Trece Martires City','Cavite',true,
  extensions.st_setsrid(extensions.st_makepoint(120.88,14.28),4326)::extensions.geography
);

insert into public.service_requests(
  id,user_account_id,category_id,address_id,status,description,scheduled_at,
  budget,service_location
)
select
  '98000000-0000-0000-0000-000000000004',
  '98000000-0000-0000-0000-000000000001',
  category.id,
  '98000000-0000-0000-0000-000000000003',
  'OPEN',
  'Matching timezone boundary request',
  '2026-07-22 16:30:00+00'::timestamptz,
  1000,
  extensions.st_setsrid(extensions.st_makepoint(120.88,14.28),4326)::extensions.geography
from public.service_categories category
where category.name = 'Plumbing';

select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.save_my_worker_matching_setup(
    14.28,120.88,20000,'Trece Martires City',
    '[{"dayOfWeek":4,"startTime":"00:00","endTime":"01:00"}]'::jsonb,
    true
  )$$,
  '55000',
  'WORKER_NOT_READY',
  'pending workers cannot go online'
);

reset role;
update public.worker_profiles
set approval_status = 'APPROVED'
where account_id = '98000000-0000-0000-0000-000000000002';

select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.save_my_worker_matching_setup(
    14.28,120.88,20000,'Trece Martires City',
    '[{"dayOfWeek":4,"startTime":"00:00","endTime":"01:00"}]'::jsonb,
    true
  )$$,
  'approved workers can save a complete matching setup'
);
select is(
  public.get_my_worker_matching_readiness()->>'matchable',
  'true',
  'complete online worker is reported as matchable'
);
select is(
  (select count(*) from public.worker_availability where worker_id = auth.uid()),
  1::bigint,
  'worker schedule is persisted transactionally'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select is(
  public.get_match_diagnostics('98000000-0000-0000-0000-000000000004')->>'reasonCode',
  'NO_MATCHES',
  'diagnostics find no exclusion when an eligible worker exists'
);
select is(
  (select count(*) from public.generate_matches('98000000-0000-0000-0000-000000000004')),
  1::bigint,
  'matching uses the Philippine-local schedule at a UTC day boundary'
);
select is(
  (select worker_id from public.match_candidates where service_request_id = '98000000-0000-0000-0000-000000000004'),
  '98000000-0000-0000-0000-000000000002'::uuid,
  'eligible worker is persisted as the request match'
);

reset role;
update public.worker_profiles
set is_available = false
where account_id = '98000000-0000-0000-0000-000000000002';
select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select is(
  public.get_match_diagnostics('98000000-0000-0000-0000-000000000004')->>'reasonCode',
  'WORKERS_OFFLINE',
  'diagnostics identify an eligible worker who is offline'
);

reset role;
update public.worker_profiles
set is_available = true,
    service_origin = private.make_location(14.60,121.20)
where account_id = '98000000-0000-0000-0000-000000000002';
select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select is(
  public.get_match_diagnostics('98000000-0000-0000-0000-000000000004')->>'reasonCode',
  'OUTSIDE_SERVICE_RADIUS',
  'diagnostics identify workers outside the coverage radius'
);

reset role;
update public.worker_profiles
set service_origin = private.make_location(14.28,120.88),
    approval_status = 'PENDING'
where account_id = '98000000-0000-0000-0000-000000000002';
select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select is(
  public.get_match_diagnostics('98000000-0000-0000-0000-000000000004')->>'reasonCode',
  'NO_APPROVED_WORKERS',
  'diagnostics identify unapproved category workers'
);

reset role;
update public.worker_profiles
set approval_status = 'APPROVED'
where account_id = '98000000-0000-0000-0000-000000000002';
update public.worker_availability
set day_of_week = 5
where worker_id = '98000000-0000-0000-0000-000000000002';
select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select is(
  public.get_match_diagnostics('98000000-0000-0000-0000-000000000004')->>'reasonCode',
  'OUTSIDE_WORKING_HOURS',
  'diagnostics identify workers outside their schedule'
);

select throws_ok(
  $$select public.get_match_diagnostics('00000000-0000-0000-0000-000000000000')$$,
  '42501',
  'SERVICE_REQUEST_UNAVAILABLE',
  'diagnostics do not expose requests that are unavailable to the caller'
);

reset role;
select * from finish();
rollback;
