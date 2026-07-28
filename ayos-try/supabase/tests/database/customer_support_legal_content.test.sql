begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select is(
  (select count(*) from public.content_pages where key in ('HELP_CENTER', 'PRIVACY')),
  2::bigint,
  'Help Center and Privacy Policy each have one content record'
);

select is(
  (select count(*) from public.content_pages where key in ('HELP_CENTER', 'PRIVACY') and published_at is not null),
  2::bigint,
  'both customer content pages are published'
);

select is(
  (select count(*) from public.content_pages where key in ('HELP_CENTER', 'PRIVACY') and version = '2026-07-23'),
  2::bigint,
  'both pages expose the current content version'
);

select is(
  (
    select count(*)
    from public.content_pages
    where key in ('HELP_CENTER', 'PRIVACY')
      and body ilike 'Local development%'
  ),
  0::bigint,
  'development placeholder content is not published'
);

select ok(
  (select body like '%## Requesting a service%' from public.content_pages where key = 'HELP_CENTER'),
  'Help Center documents service requests'
);

select ok(
  (select body like '%## Payments%' from public.content_pages where key = 'HELP_CENTER'),
  'Help Center documents payments'
);

select ok(
  (select body like '%## Optional AI processing%' from public.content_pages where key = 'PRIVACY'),
  'Privacy Policy documents optional consent-based AI processing'
);

select ok(
  (select body like '%## Retention and account requests%' from public.content_pages where key = 'PRIVACY'),
  'Privacy Policy documents retention and account requests'
);

set local role anon;
select is(
  (select count(*) from public.content_pages where key in ('HELP_CENTER', 'PRIVACY')),
  2::bigint,
  'anonymous published-content policy permits both pages to be read'
);

reset role;
select * from finish();
rollback;
