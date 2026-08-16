begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

select has_function('public','get_worker_stats'::name,array[]::text[],'worker stats RPC exists');
select has_function('public','admin_list_worker_page'::name,array['text','text','text','boolean','text','timestamptz','timestamptz','text','integer','integer']::text[],'worker page listing RPC exists');

-- Admin to run the admin RPCs (created via the admin bootstrap flow, since the
-- hosted provision_account() only provisions admins through admin_bootstrap_token).
insert into private.admin_bootstrap_requests(email, token_hash, display_name, expires_at)
values ('worker-page-admin@example.test', encode(extensions.digest('worker-page-admin-token', 'sha256'), 'hex'), 'Worker Page Admin', now() + interval '5 minutes');
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','94000000-0000-0000-0000-000000000200','authenticated','authenticated','worker-page-admin@example.test','',now(),'{}','{"admin_bootstrap_token":"worker-page-admin-token"}',now(),now());

-- Worker A: verified/active.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','94000000-0000-0000-0000-000000000101','authenticated','authenticated','worker-a@example.test','',now(),'{}','{"role":"WORKER","name":"Worker Alpha"}',now(),now());
insert into public.worker_verifications(worker_id,status) values ('94000000-0000-0000-0000-000000000101','APPROVED');
update public.worker_profiles set approval_status='APPROVED', approved_at=now() where account_id='94000000-0000-0000-0000-000000000101';
update public.accounts set created_at=now()-interval '5 days' where id='94000000-0000-0000-0000-000000000101';

-- Worker B: pending review.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','94000000-0000-0000-0000-000000000102','authenticated','authenticated','worker-b@example.test','',now(),'{}','{"role":"WORKER","name":"Worker Beta"}',now(),now());
insert into public.worker_verifications(worker_id,status) values ('94000000-0000-0000-0000-000000000102','PENDING');

-- Worker C: suspended, no verification row.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','94000000-0000-0000-0000-000000000103','authenticated','authenticated','worker-c@example.test','',now(),'{}','{"role":"WORKER","name":"Worker Gamma"}',now(),now());
update public.accounts set status='SUSPENDED' where id='94000000-0000-0000-0000-000000000103';

-- Worker D: suspended and trashed.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','94000000-0000-0000-0000-000000000104','authenticated','authenticated','worker-d@example.test','',now(),'{}','{"role":"WORKER","name":"Worker Delta"}',now(),now());
update public.accounts set status='SUSPENDED' where id='94000000-0000-0000-0000-000000000104';
insert into public.trash_entries(entity_type,entity_id,snapshot,deleted_by)
values ('worker','94000000-0000-0000-0000-000000000104','{}'::jsonb,'94000000-0000-0000-0000-000000000200');

-- Worker E: deleted account, must be excluded everywhere.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','94000000-0000-0000-0000-000000000105','authenticated','authenticated','worker-e@example.test','',now(),'{}','{"role":"WORKER","name":"Worker Echo"}',now(),now());
update public.accounts set deleted_at=now() where id='94000000-0000-0000-0000-000000000105';

-- Stats: RPC output vs ground-truth direct counts, run as the session role
-- (superuser bypasses RLS; the admin JWT satisfies is_admin). Ground truth
-- excludes the 5 seeded workers; the +N adds their expected contribution.
select set_config('request.jwt.claims','{"sub":"94000000-0000-0000-0000-000000000200","role":"authenticated","aal":"aal1"}',true);

select is(
  (select total from public.get_worker_stats()),
  (select count(*)::bigint
     from public.worker_profiles wp
     join public.accounts a on a.id = wp.account_id and a.role = 'WORKER' and a.deleted_at is null
    where wp.account_id <> all(array['94000000-0000-0000-0000-000000000101','94000000-0000-0000-0000-000000000102','94000000-0000-0000-0000-000000000103','94000000-0000-0000-0000-000000000104','94000000-0000-0000-0000-000000000105']::uuid[]))
  + 4,
  'stats total counts non-deleted workers'
);
select is(
  (select active from public.get_worker_stats()),
  (select count(*)::bigint
     from public.worker_profiles wp
     join public.accounts a on a.id = wp.account_id and a.role = 'WORKER' and a.deleted_at is null
    where wp.account_id <> all(array['94000000-0000-0000-0000-000000000101','94000000-0000-0000-0000-000000000102','94000000-0000-0000-0000-000000000103','94000000-0000-0000-0000-000000000104','94000000-0000-0000-0000-000000000105']::uuid[])
      and upper(a.status) = 'ACTIVE')
  + 2,
  'stats active counts ACTIVE workers'
);
select is(
  (select pending_review from public.get_worker_stats()),
  (select count(*)::bigint
     from public.worker_profiles wp
     join public.accounts a on a.id = wp.account_id and a.role = 'WORKER' and a.deleted_at is null
    where wp.account_id <> all(array['94000000-0000-0000-0000-000000000101','94000000-0000-0000-0000-000000000102','94000000-0000-0000-0000-000000000103','94000000-0000-0000-0000-000000000104','94000000-0000-0000-0000-000000000105']::uuid[])
      and exists (select 1 from public.worker_verifications wv
                  where wv.worker_id = wp.account_id and wv.status is distinct from 'APPROVED'))
  + 1,
  'stats pending review counts non-approved verifications'
);
select is(
  (select suspended from public.get_worker_stats()),
  (select count(*)::bigint
     from public.worker_profiles wp
     join public.accounts a on a.id = wp.account_id and a.role = 'WORKER' and a.deleted_at is null
    where wp.account_id <> all(array['94000000-0000-0000-0000-000000000101','94000000-0000-0000-0000-000000000102','94000000-0000-0000-0000-000000000103','94000000-0000-0000-0000-000000000104','94000000-0000-0000-0000-000000000105']::uuid[])
      and upper(a.status) = 'SUSPENDED')
  + 2,
  'stats suspended counts SUSPENDED workers'
);

-- Listing as the admin over the API.
select set_config('request.jwt.claims','{"sub":"94000000-0000-0000-0000-000000000200","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;

select is(
  (select array(select unnest(ids) from public.admin_list_worker_page(p_search => 'worker-') order by 1)),
  array['94000000-0000-0000-0000-000000000101','94000000-0000-0000-0000-000000000102','94000000-0000-0000-0000-000000000103','94000000-0000-0000-0000-000000000104']::uuid[],
  'default listing returns all non-deleted workers'
);
select is(
  (select array(select unnest(ids) from public.admin_list_worker_page(p_search => 'worker-', p_status => 'Suspended') order by 1)),
  array['94000000-0000-0000-0000-000000000103','94000000-0000-0000-0000-000000000104']::uuid[],
  'status filter returns suspended workers'
);
select is(
  (select array(select unnest(ids) from public.admin_list_worker_page(p_search => 'worker-', p_status => 'Trashed') order by 1)),
  array['94000000-0000-0000-0000-000000000104']::uuid[],
  'trashed filter returns trash-flagged workers'
);
select is(
  (select array(select unnest(ids) from public.admin_list_worker_page(p_search => 'worker-', p_verified => 'verified') order by 1)),
  array['94000000-0000-0000-0000-000000000101']::uuid[],
  'verified filter returns approved workers'
);
select is(
  (select array(select unnest(ids) from public.admin_list_worker_page(p_search => 'worker-', p_verified => 'unverified') order by 1)),
  array['94000000-0000-0000-0000-000000000102','94000000-0000-0000-0000-000000000103','94000000-0000-0000-0000-000000000104']::uuid[],
  'unverified filter returns non-approved workers'
);
select is(
  (select array(select unnest(ids) from public.admin_list_worker_page(p_search => 'worker-', p_review_only => true) order by 1)),
  array['94000000-0000-0000-0000-000000000102']::uuid[],
  'review-only filter returns workers with a pending verification'
);
select is(
  (select array(select unnest(ids) from public.admin_list_worker_page(p_search => 'beta') order by 1)),
  array['94000000-0000-0000-0000-000000000102']::uuid[],
  'search matches worker name'
);
select is(
  (select total_count from public.admin_list_worker_page(p_search => 'worker-', p_page => 1, p_page_size => 2)),
  4::bigint,
  'paged total_count reflects the whole filtered set'
);
select is(
  cardinality((select ids from public.admin_list_worker_page(p_search => 'worker-', p_page => 1, p_page_size => 2))),
  2,
  'paged listing returns exactly the page size'
);
select is(
  (select (ids)[1] from public.admin_list_worker_page(p_search => 'worker-', p_sort => 'oldest')),
  '94000000-0000-0000-0000-000000000101'::uuid,
  'oldest sort puts the earliest registered worker first'
);

reset role;

-- Non-admin callers are rejected.
select set_config('request.jwt.claims','{"sub":"94000000-0000-0000-0000-000000000102","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select throws_ok(
  $$select public.admin_list_worker_page()$$,
  '42501','ADMIN_REQUIRED',
  'non-admin cannot list workers'
);
select throws_ok(
  $$select public.get_worker_stats()$$,
  '42501','ADMIN_REQUIRED',
  'non-admin cannot read worker stats'
);

select * from finish();
rollback;
