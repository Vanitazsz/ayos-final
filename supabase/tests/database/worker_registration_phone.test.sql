begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select lives_ok(
  $$insert into auth.users(
    instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    '97000000-0000-0000-0000-000000000001',
    'authenticated','authenticated','local-phone-worker@example.test','',now(),'{}',
    '{"role":"WORKER","name":"Local Phone Worker","mobile":"09171234567"}',now(),now()
  )$$,
  'worker signup accepts a local Philippine mobile number'
);

select is(
  (select mobile from public.accounts where id = '97000000-0000-0000-0000-000000000001'),
  '+639171234567',
  'local worker mobile is stored in E.164 format'
);

select is(
  (select display_name from public.worker_profiles where account_id = '97000000-0000-0000-0000-000000000001'),
  'Local Phone Worker',
  'worker profile provisioning is preserved'
);

select lives_ok(
  $$insert into auth.users(
    instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    '97000000-0000-0000-0000-000000000002',
    'authenticated','authenticated','e164-phone-customer@example.test','',now(),'{}',
    '{"role":"USER","name":"E164 Phone Customer","mobile":"+639181234567"}',now(),now()
  )$$,
  'customer signup accepts an E.164 Philippine mobile number'
);

select is(
  (select mobile from public.accounts where id = '97000000-0000-0000-0000-000000000002'),
  '+639181234567',
  'an E.164 mobile number is preserved'
);

select throws_ok(
  $$insert into auth.users(
    instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    '97000000-0000-0000-0000-000000000003',
    'authenticated','authenticated','invalid-phone-worker@example.test','',now(),'{}',
    '{"role":"WORKER","name":"Invalid Phone Worker","mobile":"0917123"}',now(),now()
  )$$,
  '22023',
  'INVALID_MOBILE_NUMBER',
  'invalid signup mobile numbers fail with a named error'
);

select * from finish();
rollback;
