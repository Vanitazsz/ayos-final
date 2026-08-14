begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

select has_function('public','remove_worker_verification_document'::name,array['text'],'worker document removal RPC exists');
select has_function('public','resubmit_worker_verification_documents'::name,array['text[]'],'worker document resubmission RPC exists');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','94000000-0000-0000-0000-000000000042','authenticated','authenticated','docs-worker@example.test','',now(),'{}','{"role":"WORKER","name":"Docs Worker"}',now(),now());

insert into storage.objects(bucket_id,name,owner_id,metadata)
values
  ('verification-documents','94000000-0000-0000-0000-000000000042/front.jpg','94000000-0000-0000-0000-000000000042','{"mimetype":"image/jpeg","size":1024}'),
  ('verification-documents','94000000-0000-0000-0000-000000000042/back.jpg','94000000-0000-0000-0000-000000000042','{"mimetype":"image/jpeg","size":1024}'),
  ('verification-documents','94000000-0000-0000-0000-000000000042/front2.jpg','94000000-0000-0000-0000-000000000042','{"mimetype":"image/jpeg","size":1024}'),
  ('verification-documents','94000000-0000-0000-0000-000000000042/back2.jpg','94000000-0000-0000-0000-000000000042','{"mimetype":"image/jpeg","size":1024}'),
  ('verification-documents','94000000-0000-0000-0000-000000000042/extra.jpg','94000000-0000-0000-0000-000000000042','{"mimetype":"image/jpeg","size":1024}');

insert into public.worker_verifications(worker_id, status, identity_data, document_paths)
values ('94000000-0000-0000-0000-000000000042','NEEDS_DOCUMENTS','{}',array['94000000-0000-0000-0000-000000000042/front.jpg','94000000-0000-0000-0000-000000000042/back.jpg','94000000-0000-0000-0000-000000000042/extra.jpg']);

select set_config('request.jwt.claims','{"sub":"94000000-0000-0000-0000-000000000042","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;

-- Removal while NEEDS_DOCUMENTS
select lives_ok(
  $$select public.remove_worker_verification_document('94000000-0000-0000-0000-000000000042/front.jpg')$$,
  'worker removes a document while NEEDS_DOCUMENTS'
);
select is(
  (select cardinality(document_paths) from public.worker_verifications where worker_id='94000000-0000-0000-0000-000000000042'),
  2::bigint,
  'removal shrinks the document list'
);
select is(
  (select '94000000-0000-0000-0000-000000000042/front.jpg' = any(document_paths) from public.worker_verifications where worker_id='94000000-0000-0000-0000-000000000042'),
  false,
  'removed path is no longer listed'
);
select is(
  (select count(*) from storage.objects where bucket_id='verification-documents' and name='94000000-0000-0000-0000-000000000042/front.jpg'),
  0::bigint,
  'the storage object is deleted with the path'
);

-- Removal while PENDING
reset role;
update public.worker_verifications set status='PENDING' where worker_id='94000000-0000-0000-0000-000000000042';
set local role authenticated;
select lives_ok(
  $$select public.remove_worker_verification_document('94000000-0000-0000-0000-000000000042/extra.jpg')$$,
  'worker removes a document while PENDING'
);
select is(
  (select cardinality(document_paths) from public.worker_verifications where worker_id='94000000-0000-0000-0000-000000000042'),
  1::bigint,
  'PENDING removal updates the document list'
);

-- Removal errors
select throws_ok(
  $$select public.remove_worker_verification_document('94000000-0000-0000-0000-000000000042/front.jpg')$$,
  '22023','DOCUMENT_NOT_FOUND',
  'removing a path that is no longer listed is rejected'
);
select throws_ok(
  $$select public.remove_worker_verification_document('other-owner/x.jpg')$$,
  '22023','INVALID_DOCUMENT_PATH',
  'paths outside the worker folder are rejected'
);
reset role;
update public.worker_verifications set status='APPROVED' where worker_id='94000000-0000-0000-0000-000000000042';
set local role authenticated;
select throws_ok(
  $$select public.remove_worker_verification_document('94000000-0000-0000-0000-000000000042/back.jpg')$$,
  '55000','VERIFICATION_NOT_ACTIONABLE',
  'approved verification cannot be edited'
);
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000099","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select throws_ok(
  $$select public.remove_worker_verification_document('94000000-0000-0000-0000-000000000042/back.jpg')$$,
  '42501','WORKER_ROLE_REQUIRED',
  'non-worker role cannot remove documents'
);

-- Resubmission
reset role;
update public.worker_verifications set status='NEEDS_DOCUMENTS' where worker_id='94000000-0000-0000-0000-000000000042';
select set_config('request.jwt.claims','{"sub":"94000000-0000-0000-0000-000000000042","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select lives_ok(
  $$select public.resubmit_worker_verification_documents(array['94000000-0000-0000-0000-000000000042/front2.jpg','94000000-0000-0000-0000-000000000042/back2.jpg'])$$,
  'worker resubmits a fresh document pair'
);
select is(
  (select status from public.worker_verifications where worker_id='94000000-0000-0000-0000-000000000042'),
  'PENDING'::public.worker_approval_status,
  'resubmission returns the application to PENDING'
);
select is(
  (select cardinality(document_paths) from public.worker_verifications where worker_id='94000000-0000-0000-0000-000000000042'),
  2::bigint,
  'resubmission replaces the document list'
);
select is(
  (select '94000000-0000-0000-0000-000000000042/front2.jpg' = any(document_paths)
      and '94000000-0000-0000-0000-000000000042/back2.jpg' = any(document_paths)
   from public.worker_verifications where worker_id='94000000-0000-0000-0000-000000000042'),
  true,
  'the new document pair is recorded'
);
select throws_ok(
  $$select public.resubmit_worker_verification_documents(array['94000000-0000-0000-0000-000000000042/front2.jpg'])$$,
  '22023','INVALID_VERIFICATION_DOCUMENT',
  'resubmission requires exactly two documents'
);
select throws_ok(
  $$select public.resubmit_worker_verification_documents(array['94000000-0000-0000-0000-000000000042/front2.jpg','other-owner/x.jpg'])$$,
  '22023','INVALID_VERIFICATION_DOCUMENT',
  'resubmission rejects files the worker does not own'
);
reset role;
update public.worker_verifications set status='APPROVED' where worker_id='94000000-0000-0000-0000-000000000042';
set local role authenticated;
select throws_ok(
  $$select public.resubmit_worker_verification_documents(array['94000000-0000-0000-0000-000000000042/front2.jpg','94000000-0000-0000-0000-000000000042/back2.jpg'])$$,
  '55000','VERIFICATION_CANNOT_BE_RESUBMITTED',
  'approved verification cannot be resubmitted'
);
reset role;
update public.worker_verifications set status='REJECTED' where worker_id='94000000-0000-0000-0000-000000000042';
set local role authenticated;
select lives_ok(
  $$select public.resubmit_worker_verification_documents(array['94000000-0000-0000-0000-000000000042/front2.jpg','94000000-0000-0000-0000-000000000042/back2.jpg'])$$,
  'worker can resubmit documents after a rejection'
);

-- Audit trail
select is(
  (select count(*) from public.audit_logs where entity_type='worker_verification' and action='WORKER_VERIFICATION_DOCUMENT_REMOVED'),
  2::bigint,
  'document removals are audited'
);
select is(
  (select count(*) from public.audit_logs where entity_type='worker_verification' and action='WORKER_VERIFICATION_DOCUMENTS_RESUBMITTED'),
  2::bigint,
  'document resubmissions are audited'
);

select * from finish();
rollback;
