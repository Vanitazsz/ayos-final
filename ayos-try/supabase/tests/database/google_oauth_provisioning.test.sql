begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

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
  'google-oauth@example.test',
  '',
  now(),
  '{"provider":"google","providers":["google"]}',
  '{"name":"Google OAuth User","full_name":"Google OAuth User"}',
  now(),
  now()
);

select is(
  (
    select role::text
    from public.accounts
    where id = '97000000-0000-0000-0000-000000000001'
  ),
  'USER',
  'first-time Google identity is provisioned as a customer'
);
select is(
  (
    select status::text
    from public.accounts
    where id = '97000000-0000-0000-0000-000000000001'
  ),
  'ACTIVE',
  'confirmed Google identity is active'
);
select is(
  (
    select display_name
    from public.user_profiles
    where account_id = '97000000-0000-0000-0000-000000000001'
  ),
  'Google OAuth User',
  'Google profile name is persisted'
);
select is(
  (
    select count(*)
    from public.account_role_memberships
    where account_id = '97000000-0000-0000-0000-000000000001'
      and role = 'USER'
  ),
  1::bigint,
  'Google identity has exactly one customer role membership'
);

select * from finish();
rollback;
