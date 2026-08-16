begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select has_function('public','delete_worker_verification'::name,array[]::text[],'worker verification deletion RPC exists');

-- Worker A: has a PENDING verification with documents on storage.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','94000000-0000-0000-0000-000000000044','authenticated','authenticated','delete-worker@example.test','',now(),'{}','{"role":"WORKER","name":"Delete Worker"}',now(),now());

insert into storage.objects(bucket_id,name,owner_id,metadata)
values
  ('verification-documents','94000000-0000-0000-0000-000000000044/front.jpg','94000000-0000-0000-0000-000000000044','{"mimetype":"image/jpeg","size":1024}'),
  ('verification-documents','94000000-0000-0000-0000-000000000044/back.jpg','94000000-0000-0000-0000-000000000044','{"mimetype":"image/jpeg","size":1024}');

insert into public.worker_verifications(worker_id, status, identity_data, document_paths)
values ('94000000-0000-0000-0000-000000000044','PENDING','{"displayName":"Delete Worker"}',array['94000000-0000-0000-0000-000000000044/front.jpg','94000000-0000-0000-0000-000000000044/back.jpg']);

-- Worker B: has a NEEDS_DOCUMENTS verification with documents on storage.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','94000000-0000-0000-0000-000000000045','authenticated','authenticated','delete-worker-2@example.test','',now(),'{}','{"role":"WORKER","name":"Delete Worker 2"}',now(),now());

insert into storage.objects(bucket_id,name,owner_id,metadata)
values
  ('verification-documents','94000000-0000-0000-0000-000000000045/front.jpg','94000000-0000-0000-0000-000000000045','{"mimetype":"image/jpeg","size":1024}'),
  ('verification-documents','94000000-0000-0000-0000-000000000045/back.jpg','94000000-0000-0000-0000-000000000045','{"mimetype":"image/jpeg","size":1024}');

insert into public.worker_verifications(worker_id, status, identity_data, document_paths)
values ('94000000-0000-0000-0000-000000000045','NEEDS_DOCUMENTS','{"displayName":"Delete Worker 2"}',array['94000000-0000-0000-0000-000000000045/front.jpg','94000000-0000-0000-0000-000000000045/back.jpg']);
update public.worker_profiles set approval_status = 'NEEDS_DOCUMENTS' where account_id = '94000000-0000-0000-0000-000000000045';

-- Deletion while PENDING.
select set_config('request.jwt.claims','{"sub":"94000000-0000-0000-0000-000000000044","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select lives_ok(
  $$select public.delete_worker_verification()$$,
  'worker deletes a PENDING submission'
);
select is(
  (select count(*) from public.worker_verifications where worker_id='94000000-0000-0000-0000-000000000044'),
  0::bigint,
  'the verification row is deleted'
);
select is(
  (select approval_status::text from public.worker_profiles where account_id='94000000-0000-0000-0000-000000000044'),
  'PENDING',
  'profile approval status resets to PENDING'
);
select is(
  (select is_available from public.worker_profiles where account_id='94000000-0000-0000-0000-000000000044'),
  false,
  'profile availability resets to false'
);
select is(
  (select approved_at from public.worker_profiles where account_id='94000000-0000-0000-0000-000000000044'),
  null,
  'profile approved_at resets to null'
);
select is(
  (select count(*) from storage.objects where bucket_id='verification-documents' and name='94000000-0000-0000-0000-000000000044/front.jpg'),
  1::bigint,
  'the RPC leaves storage objects for the client to delete via the Storage API'
);
reset role;

-- Deletion while NEEDS_DOCUMENTS.
select set_config('request.jwt.claims','{"sub":"94000000-0000-0000-0000-000000000045","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select lives_ok(
  $$select public.delete_worker_verification()$$,
  'worker deletes a NEEDS_DOCUMENTS submission'
);
select is(
  (select count(*) from public.worker_verifications where worker_id='94000000-0000-0000-0000-000000000045'),
  0::bigint,
  'NEEDS_DOCUMENTS submission row is deleted'
);
select is(
  (select approval_status::text from public.worker_profiles where account_id='94000000-0000-0000-0000-000000000045'),
  'PENDING',
  'NEEDS_DOCUMENTS profile resets to PENDING'
);
select is(
  (select is_available from public.worker_profiles where account_id='94000000-0000-0000-0000-000000000045'),
  false,
  'NEEDS_DOCUMENTS profile availability resets to false'
);
reset role;

-- Deletion errors: no verification on file, approved, rejected, wrong role.
select set_config('request.jwt.claims','{"sub":"94000000-0000-0000-0000-000000000044","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select throws_ok(
  $$select public.delete_worker_verification()$$,
  'P0002','VERIFICATION_NOT_FOUND',
  'deleting with no verification on file is rejected'
);
reset role;
insert into public.worker_verifications(worker_id, status, identity_data, document_paths)
values ('94000000-0000-0000-0000-000000000044','APPROVED','{}',array['94000000-0000-0000-0000-000000000044/front.jpg']);
update public.worker_profiles set approval_status = 'APPROVED', is_available = true where account_id = '94000000-0000-0000-0000-000000000044';
select set_config('request.jwt.claims','{"sub":"94000000-0000-0000-0000-000000000044","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select throws_ok(
  $$select public.delete_worker_verification()$$,
  '55000','VERIFICATION_NOT_DELETABLE',
  'approved verification cannot be deleted'
);
reset role;
insert into public.worker_verifications(worker_id, status, identity_data, document_paths)
values ('94000000-0000-0000-0000-000000000045','REJECTED','{}',array['94000000-0000-0000-0000-000000000045/front.jpg']);
update public.worker_profiles set approval_status = 'REJECTED' where account_id = '94000000-0000-0000-0000-000000000045';
select set_config('request.jwt.claims','{"sub":"94000000-0000-0000-0000-000000000045","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select throws_ok(
  $$select public.delete_worker_verification()$$,
  '55000','VERIFICATION_NOT_DELETABLE',
  'rejected verification cannot be deleted'
);
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000099","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select throws_ok(
  $$select public.delete_worker_verification()$$,
  '42501','WORKER_ROLE_REQUIRED',
  'non-worker role cannot delete a verification'
);

-- Audit trail
select is(
  (select count(*) from public.audit_logs where entity_type='worker_verification' and action='WORKER_VERIFICATION_DELETED'),
  2::bigint,
  'verification deletions are audited'
);

select * from finish();
rollback;
