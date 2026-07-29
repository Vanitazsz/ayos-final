begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_table('public', 'customer_verifications', 'customer verifications are persisted');
select has_column('public', 'user_profiles', 'verification_status', 'customer verification status is persisted');
select has_function('public', 'submit_customer_verification', array['text', 'text', 'text'], 'customer submission RPC exists');
select has_function('public', 'admin_review_customer_verification', array['uuid', 'text', 'text'], 'admin review RPC exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.customer_verifications'::regclass),
  'customer verification RLS is enabled'
);
select is(
  (select public from storage.buckets where id = 'verification-documents'),
  false,
  'verification documents remain private'
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
  '96000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'verification-customer@example.test',
  '',
  now(),
  '{}',
  '{"role":"USER","name":"Verification Customer"}',
  now(),
  now()
);

insert into storage.objects(bucket_id, name, owner_id, metadata)
values
  (
    'verification-documents',
    '96000000-0000-0000-0000-000000000001/front.jpg',
    '96000000-0000-0000-0000-000000000001',
    '{"mimetype":"image/jpeg","size":1024}'
  ),
  (
    'verification-documents',
    '96000000-0000-0000-0000-000000000001/back.jpg',
    '96000000-0000-0000-0000-000000000001',
    '{"mimetype":"image/jpeg","size":1024}'
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"96000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.submit_customer_verification(
    'philsys',
    '96000000-0000-0000-0000-000000000001/front.jpg',
    '96000000-0000-0000-0000-000000000001/back.jpg'
  )$$,
  'customer can submit owned ID documents'
);
select is(
  (select status from public.customer_verifications where customer_id = auth.uid()),
  'pending',
  'verification enters the pending queue'
);
select is(
  (select verification_status from public.user_profiles where account_id = auth.uid()),
  'pending',
  'customer profile becomes pending'
);
select throws_ok(
  $$select public.submit_customer_verification(
    'philsys',
    '96000000-0000-0000-0000-000000000001/front.jpg',
    '96000000-0000-0000-0000-000000000001/back.jpg'
  )$$,
  '23505',
  'VERIFICATION_ALREADY_PENDING',
  'a second pending verification is rejected'
);

reset role;
insert into private.admin_bootstrap_requests(
  email,
  token_hash,
  display_name,
  expires_at
) values (
  'verification-admin@example.test',
  encode(extensions.digest('verification-admin-token', 'sha256'), 'hex'),
  'Verification Administrator',
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
  '96000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'verification-admin@example.test',
  '',
  now(),
  '{}',
  '{"admin_bootstrap_token":"verification-admin-token"}',
  now(),
  now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"96000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select lives_ok(
  format(
    $$select public.admin_review_customer_verification(%L::uuid, 'approved', 'Documents verified')$$,
    (
      select id
      from public.customer_verifications
      where customer_id = '96000000-0000-0000-0000-000000000001'
    )
  ),
  'administrator can approve a pending verification'
);
select is(
  (
    select verification_status
    from public.user_profiles
    where account_id = '96000000-0000-0000-0000-000000000001'
  ),
  'verified',
  'approval verifies the customer profile'
);

select * from finish();
rollback;
