begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

select has_table('public','industries','industry taxonomy exists');
select has_column('public','service_categories','industry_id','skills belong to an industry');
select has_column('public','worker_profiles','primary_industry_id','worker primary industry is persisted');
select ok((select relrowsecurity from pg_class where oid='public.industries'::regclass),'industry RLS is enabled');
select is((select count(*) from public.industries where is_active),10::bigint,'ten active industries are seeded');
select is((select count(*) from public.service_categories where industry_id is not null and is_active),50::bigint,'fifty active taxonomy skills are seeded');
select is((select count(distinct slug) from public.industries),10::bigint,'industry slugs are unique');
select is((select count(distinct slug) from public.service_categories where industry_id is not null),50::bigint,'skill slugs are unique');
select is((select count(*) from public.service_categories where name in ('Cleaning','Electrical','Plumbing') and industry_id is not null),3::bigint,'existing core categories are retained and mapped');
select is(has_table_privilege('authenticated','public.worker_skills','insert'),false,'clients cannot bypass onboarding skill validation');
select is(has_table_privilege('authenticated','public.worker_skills','update'),false,'clients cannot rewrite onboarding skills directly');
select is(has_table_privilege('authenticated','public.worker_skills','delete'),false,'clients cannot delete onboarding skills directly');
select ok(position('submit_worker_onboarding_identity' in pg_get_functiondef('public.submit_worker_application(jsonb,text[],text,text)'::regprocedure))>0,'public worker application uses the taxonomy validator');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','94000000-0000-0000-0000-000000000001','authenticated','authenticated','taxonomy-worker@example.test','',now(),'{}','{"role":"WORKER","name":"Taxonomy Worker"}',now(),now());
insert into storage.objects(bucket_id,name,owner_id,metadata)
values
  ('verification-documents','94000000-0000-0000-0000-000000000001/front.jpg','94000000-0000-0000-0000-000000000001','{"mimetype":"image/jpeg","size":1024}'),
  ('verification-documents','94000000-0000-0000-0000-000000000001/back.jpg','94000000-0000-0000-0000-000000000001','{"mimetype":"image/jpeg","size":1024}');

select set_config('request.jwt.claims','{"sub":"94000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;

select lives_ok(
  format(
    $$select public.submit_worker_onboarding_identity(
      %L::jsonb,
      array['94000000-0000-0000-0000-000000000001/front.jpg','94000000-0000-0000-0000-000000000001/back.jpg']
    )$$,
    jsonb_build_object(
      'firstName','Taxonomy','lastName','Worker','phone','09171234567','birthday','01/01/1990','gender','other',
      'industryId',(select id from public.industries where slug='cleaning'),
      'skillIds',jsonb_build_array(
        (select id from public.service_categories where slug='cleaning'),
        (select id from public.service_categories where slug='deep-cleaning')
      ),
      'employmentType','freelance',
      'address',jsonb_build_object('street','Test Street','city','Quezon City','province','Metro Manila'),
      'contactPerson','Taxonomy Contact','contactPhone','09171234567','idType','philsys',
      'consents',jsonb_build_object('informationAccurate',true,'privacy',true,'terms',true)
    )::text
  ),
  'valid worker taxonomy is persisted transactionally'
);
select is((select industry.slug from public.worker_profiles profile join public.industries industry on industry.id=profile.primary_industry_id where profile.account_id='94000000-0000-0000-0000-000000000001'),'cleaning','selected primary industry is stored');
select is((select count(*) from public.worker_skills where worker_id='94000000-0000-0000-0000-000000000001'),2::bigint,'selected worker skills are stored');
select is((select count(*) from public.worker_verifications where worker_id='94000000-0000-0000-0000-000000000001'),1::bigint,'verification is created once');

select throws_ok(
  format(
    $$select public.submit_worker_onboarding_identity(
      %L::jsonb,
      array['94000000-0000-0000-0000-000000000001/front.jpg','94000000-0000-0000-0000-000000000001/back.jpg']
    )$$,
    jsonb_build_object(
      'firstName','Taxonomy','lastName','Worker','phone','09171234567','birthday','01/01/1990','gender','other',
      'industryId',(select id from public.industries where slug='cleaning'),
      'skillIds',jsonb_build_array((select id from public.service_categories where slug='electrical')),
      'employmentType','freelance','address',jsonb_build_object('street','Test Street','city','Quezon City','province','Metro Manila'),
      'contactPerson','Taxonomy Contact','contactPhone','09171234567','idType','philsys',
      'consents',jsonb_build_object('informationAccurate',true,'privacy',true,'terms',true)
    )::text
  ),
  '22023','INVALID_WORKER_SKILLS','a skill from another industry is rejected'
);
select throws_ok(
  $$select public.submit_worker_onboarding_identity(
    '{"firstName":"Taxonomy","lastName":"Worker","phone":"09171234567","birthday":"01/01/1990","gender":"other","industryId":"not-a-uuid","skillIds":["custom skill"],"employmentType":"freelance","address":{"street":"Test Street","city":"Quezon City","province":"Metro Manila"},"contactPerson":"Taxonomy Contact","contactPhone":"09171234567","idType":"philsys","consents":{"informationAccurate":true,"privacy":true,"terms":true}}'::jsonb,
    array['94000000-0000-0000-0000-000000000001/front.jpg','94000000-0000-0000-0000-000000000001/back.jpg']
  )$$,
  '22023','INVALID_WORKER_ONBOARDING','custom taxonomy strings are rejected'
);
select throws_ok(
  format(
    $$select public.submit_worker_onboarding_identity(
      %L::jsonb,
      array['94000000-0000-0000-0000-000000000001/front.jpg','94000000-0000-0000-0000-000000000001/back.jpg']
    )$$,
    jsonb_build_object(
      'firstName','Taxonomy','lastName','Worker','phone','09171234567','birthday','01/01/1990','gender','other',
      'industryId',(select id from public.industries where slug='cleaning'),'skillIds','[]'::jsonb,
      'employmentType','freelance','address',jsonb_build_object('street','Test Street','city','Quezon City','province','Metro Manila'),
      'contactPerson','Taxonomy Contact','contactPhone','09171234567','idType','philsys',
      'consents',jsonb_build_object('informationAccurate',true,'privacy',true,'terms',true)
    )::text
  ),
  '22023','INVALID_WORKER_ONBOARDING','an empty skill selection is rejected'
);
select throws_ok(
  format(
    $$select public.submit_worker_onboarding_identity(
      %L::jsonb,
      array['94000000-0000-0000-0000-000000000001/front.jpg','94000000-0000-0000-0000-000000000001/back.jpg']
    )$$,
    jsonb_build_object(
      'firstName','Taxonomy','lastName','Worker','phone','09171234567','birthday','01/01/1990','gender','other',
      'industryId',(select id from public.industries where slug='cleaning'),
      'skillIds',(select jsonb_agg((select id from public.service_categories where slug='cleaning')) from generate_series(1,11)),
      'employmentType','freelance','address',jsonb_build_object('street','Test Street','city','Quezon City','province','Metro Manila'),
      'contactPerson','Taxonomy Contact','contactPhone','09171234567','idType','philsys',
      'consents',jsonb_build_object('informationAccurate',true,'privacy',true,'terms',true)
    )::text
  ),
  '22023','INVALID_WORKER_ONBOARDING','more than ten skills are rejected'
);

reset role;
select set_config('app.test.inactive_industry_id',(select id::text from public.industries where slug='carpentry'),true);
update public.industries set is_active=false where slug='carpentry';
select set_config('request.jwt.claims','{"sub":"94000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select throws_ok(
  format(
    $$select public.submit_worker_onboarding_identity(
      %L::jsonb,
      array['94000000-0000-0000-0000-000000000001/front.jpg','94000000-0000-0000-0000-000000000001/back.jpg']
    )$$,
    jsonb_build_object(
      'firstName','Taxonomy','lastName','Worker','phone','09171234567','birthday','01/01/1990','gender','other',
      'industryId',current_setting('app.test.inactive_industry_id')::uuid,
      'skillIds',jsonb_build_array((select id from public.service_categories where slug='furniture-repair')),
      'employmentType','freelance','address',jsonb_build_object('street','Test Street','city','Quezon City','province','Metro Manila'),
      'contactPerson','Taxonomy Contact','contactPhone','09171234567','idType','philsys',
      'consents',jsonb_build_object('informationAccurate',true,'privacy',true,'terms',true)
    )::text
  ),
  '22023','INVALID_WORKER_SKILLS','an inactive industry is rejected'
);

reset role;
update public.service_categories set is_active=false where slug='deep-cleaning';
select set_config('request.jwt.claims','{"sub":"94000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select throws_ok(
  format(
    $$select public.submit_worker_onboarding_identity(
      %L::jsonb,
      array['94000000-0000-0000-0000-000000000001/front.jpg','94000000-0000-0000-0000-000000000001/back.jpg']
    )$$,
    jsonb_build_object(
      'firstName','Taxonomy','lastName','Worker','phone','09171234567','birthday','01/01/1990','gender','other',
      'industryId',(select id from public.industries where slug='cleaning'),
      'skillIds',jsonb_build_array((select id from public.service_categories where slug='deep-cleaning')),
      'employmentType','freelance','address',jsonb_build_object('street','Test Street','city','Quezon City','province','Metro Manila'),
      'contactPerson','Taxonomy Contact','contactPhone','09171234567','idType','philsys',
      'consents',jsonb_build_object('informationAccurate',true,'privacy',true,'terms',true)
    )::text
  ),
  '22023','INVALID_WORKER_SKILLS','an inactive skill is rejected'
);
select is((select count(*) from public.worker_skills where worker_id='94000000-0000-0000-0000-000000000001'),2::bigint,'failed submissions do not change persisted skills');
select is((select industry.slug from public.worker_profiles profile join public.industries industry on industry.id=profile.primary_industry_id where profile.account_id='94000000-0000-0000-0000-000000000001'),'cleaning','failed submissions do not change the primary industry');

reset role;
select * from finish();
rollback;
