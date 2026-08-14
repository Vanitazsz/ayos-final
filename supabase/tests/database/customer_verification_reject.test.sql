begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users(
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '97000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'reject-customer@example.test',
  '',
  now(),
  '{}',
  '{"role":"USER","name":"Reject Customer"}',
  now(),
  now()
);

insert into storage.objects(bucket_id, name, owner_id, metadata)
values
  (
    'verification-documents',
    '97000000-0000-0000-0000-000000000001/front.jpg',
    '97000000-0000-0000-0000-000000000001',
    '{"mimetype":"image/jpeg","size":1024}'
  ),
  (
    'verification-documents',
    '97000000-0000-0000-0000-000000000001/back.jpg',
    '97000000-0000-0000-0000-000000000001',
    '{"mimetype":"image/jpeg","size":1024}'
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.submit_customer_verification(
    'passport',
    '97000000-0000-0000-0000-000000000001/front.jpg',
    '97000000-0000-0000-0000-000000000001/back.jpg'
  )$$,
  'customer can submit owned ID documents'
);
select is(
  (select status from public.customer_verifications where customer_id = auth.uid()),
  'pending',
  'verification enters the pending queue'
);

reset role;
insert into private.admin_bootstrap_requests(
  email,
  token_hash,
  display_name,
  expires_at
) values (
  'reject-admin@example.test',
  encode(extensions.digest('reject-admin-token', 'sha256'), 'hex'),
  'Reject Administrator',
  now() + interval '5 minutes'
);
insert into auth.users(
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '97000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'reject-admin@example.test',
  '',
  now(),
  '{}',
  '{"admin_bootstrap_token":"reject-admin-token"}',
  now(),
  now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select lives_ok(
  format(
    $$select public.admin_review_customer_verification(%L::uuid, 'rejected', 'Invalid document')$$,
    (
      select id
      from public.customer_verifications
      where customer_id = '97000000-0000-0000-0000-000000000001'
    )
  ),
  'administrator can reject a pending verification'
);

select is(
  (select status from public.customer_verifications where customer_id = '97000000-0000-0000-0000-000000000001'),
  'rejected',
  'verification is marked rejected'
);
select is(
  (select id_front_url from public.customer_verifications where customer_id = '97000000-0000-0000-0000-000000000001'),
  null,
  'rejected front document URL is cleared'
);
select is(
  (select id_back_url from public.customer_verifications where customer_id = '97000000-0000-0000-0000-000000000001'),
  null,
  'rejected back document URL is cleared'
);
select is(
  (select verification_status from public.user_profiles where account_id = '97000000-0000-0000-0000-000000000001'),
  'rejected',
  'customer profile becomes rejected'
);
select policy_cmd_is(
  'storage',
  'objects',
  'customer_verification_documents_admin_delete',
  'delete',
  'administrators can delete customer verification documents'
);
select throws_ok(
  format(
    $$select public.admin_review_customer_verification(%L::uuid, 'rejected', 'Again')$$,
    (
      select id
      from public.customer_verifications
      where customer_id = '97000000-0000-0000-0000-000000000001'
    )
  ),
  '55000',
  'VERIFICATION_ALREADY_REVIEWED',
  'a reviewed verification cannot be reviewed again'
);
select is(
  (select (metadata ->> 'cleared_images')::boolean
    from public.audit_logs
    where action = 'CUSTOMER_VERIFICATION_REVIEWED'
      and entity_id = (
        select id::text
        from public.customer_verifications
        where customer_id = '97000000-0000-0000-0000-000000000001'
      )),
  true,
  'audit records that images were cleared'
);

reset role;
insert into storage.objects(bucket_id, name, owner_id, metadata)
values
  (
    'verification-documents',
    '97000000-0000-0000-0000-000000000001/front2.jpg',
    '97000000-0000-0000-0000-000000000001',
    '{"mimetype":"image/jpeg","size":1024}'
  ),
  (
    'verification-documents',
    '97000000-0000-0000-0000-000000000001/back2.jpg',
    '97000000-0000-0000-0000-000000000001',
    '{"mimetype":"image/jpeg","size":1024}'
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.submit_customer_verification(
    'passport',
    '97000000-0000-0000-0000-000000000001/front2.jpg',
    '97000000-0000-0000-0000-000000000001/back2.jpg'
  )$$,
  'customer can re-submit documents after a rejection'
);
select is(
  (select count(*) from public.customer_verifications
    where customer_id = auth.uid() and status = 'pending'),
  1::bigint,
  're-submission creates exactly one pending verification'
);

select * from finish();
rollback;
