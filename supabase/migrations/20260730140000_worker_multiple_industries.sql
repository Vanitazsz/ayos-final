begin;

create table if not exists public.worker_industries (
  worker_id uuid not null references public.worker_profiles(account_id) on delete cascade,
  industry_id uuid not null references public.industries(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (worker_id, industry_id)
);

create index if not exists worker_industries_industry_idx
  on public.worker_industries(industry_id, worker_id);

insert into public.worker_industries(worker_id, industry_id)
select profile.account_id, profile.primary_industry_id
from public.worker_profiles profile
where profile.primary_industry_id is not null
on conflict (worker_id, industry_id) do nothing;

alter table public.worker_industries enable row level security;

drop policy if exists worker_industries_select_own on public.worker_industries;
create policy worker_industries_select_own
on public.worker_industries
for select
to authenticated
using (worker_id = auth.uid());

grant select on public.worker_industries to authenticated;

drop function if exists public.save_my_worker_skills(uuid, jsonb);

create function public.save_my_worker_skills(
  p_industry_ids uuid[],
  p_skills jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  industry_count integer;
  skill_count integer;
begin
  if not exists (
    select 1
    from public.accounts account
    where account.id = auth.uid()
      and account.role = 'WORKER'
      and account.status = 'ACTIVE'
      and account.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'WORKER_ROLE_REQUIRED';
  end if;

  if p_industry_ids is null
    or cardinality(p_industry_ids) not between 1 and 10
    or array_position(p_industry_ids, null) is not null
  then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_INDUSTRIES';
  end if;

  select count(distinct industry_id)
  into industry_count
  from unnest(p_industry_ids) as selected(industry_id);
  if industry_count <> cardinality(p_industry_ids)
    or (
      select count(*)
      from public.industries industry
      where industry.id = any(p_industry_ids)
        and industry.is_active
    ) <> cardinality(p_industry_ids)
  then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_INDUSTRIES';
  end if;

  if jsonb_typeof(p_skills) is distinct from 'array'
    or jsonb_array_length(p_skills) not between 1 and 50
    or exists (
      select 1
      from jsonb_array_elements(p_skills) entry
      where jsonb_typeof(entry) is distinct from 'object'
        or coalesce(entry->>'categoryId', '') !~
          '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        or coalesce(entry->>'years', '') !~ '^[0-9]{1,2}$'
        or (entry->>'years')::integer not between 0 and 80
        or (
          entry ? 'rateMinor'
          and entry->'rateMinor' <> 'null'::jsonb
          and (
            jsonb_typeof(entry->'rateMinor') <> 'number'
            or (entry->>'rateMinor')::numeric <> trunc((entry->>'rateMinor')::numeric)
            or (entry->>'rateMinor')::numeric < 100
          )
        )
    )
  then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_SKILLS';
  end if;

  select count(distinct (entry->>'categoryId')::uuid)
  into skill_count
  from jsonb_array_elements(p_skills) entry;
  if skill_count <> jsonb_array_length(p_skills) then
    raise exception using errcode = '22023', message = 'DUPLICATE_WORKER_SKILL';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_skills) entry
    left join public.service_categories category
      on category.id = (entry->>'categoryId')::uuid
    where category.id is null
      or not category.is_active
      or category.industry_id <> all(p_industry_ids)
  ) then
    raise exception using errcode = '22023', message = 'SKILL_OUTSIDE_INDUSTRY';
  end if;

  update public.worker_profiles
  set primary_industry_id = p_industry_ids[1],
      updated_at = now()
  where account_id = auth.uid();
  if not found then
    raise exception using errcode = 'P0002', message = 'WORKER_PROFILE_NOT_FOUND';
  end if;

  delete from public.worker_industries
  where worker_id = auth.uid();

  insert into public.worker_industries(worker_id, industry_id)
  select auth.uid(), industry_id
  from unnest(p_industry_ids) as selected(industry_id);

  delete from public.worker_skills
  where worker_id = auth.uid();

  insert into public.worker_skills(worker_id, category_id, years, rate_minor)
  select
    auth.uid(),
    (entry->>'categoryId')::uuid,
    (entry->>'years')::integer,
    case
      when entry->'rateMinor' is null or entry->'rateMinor' = 'null'::jsonb
        then null
      else (entry->>'rateMinor')::bigint
    end
  from jsonb_array_elements(p_skills) entry;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'WORKER_SKILLS_AND_RATES_UPDATED',
    'worker_profile',
    auth.uid()::text,
    jsonb_build_object(
      'industry_ids', to_jsonb(p_industry_ids),
      'skill_count', skill_count
    )
  );

  return jsonb_build_object(
    'primaryIndustryId', p_industry_ids[1],
    'selectedIndustryIds', to_jsonb(p_industry_ids),
    'skillCount', skill_count
  );
end
$$;

revoke all on function public.save_my_worker_skills(uuid[], jsonb)
from public, anon;
grant execute on function public.save_my_worker_skills(uuid[], jsonb)
to authenticated;

create or replace function public.get_my_worker_skills()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  worker public.worker_profiles;
  saved_industries jsonb;
  saved_skills jsonb;
begin
  if not exists (
    select 1
    from public.accounts account
    where account.id = auth.uid()
      and account.role = 'WORKER'
      and account.status = 'ACTIVE'
      and account.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'WORKER_ROLE_REQUIRED';
  end if;

  select *
  into worker
  from public.worker_profiles
  where account_id = auth.uid();

  if worker.account_id is null then
    raise exception using errcode = 'P0002', message = 'WORKER_PROFILE_NOT_FOUND';
  end if;

  select coalesce(jsonb_agg(link.industry_id order by link.industry_id), '[]'::jsonb)
  into saved_industries
  from public.worker_industries link
  where link.worker_id = worker.account_id;

  if saved_industries = '[]'::jsonb and worker.primary_industry_id is not null then
    saved_industries := jsonb_build_array(worker.primary_industry_id);
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'categoryId', skill.category_id,
        'years', skill.years,
        'rateMinor', skill.rate_minor
      )
      order by category.name, skill.category_id
    ),
    '[]'::jsonb
  )
  into saved_skills
  from public.worker_skills skill
  join public.service_categories category on category.id = skill.category_id
  where skill.worker_id = worker.account_id;

  return jsonb_build_object(
    'primaryIndustryId', worker.primary_industry_id,
    'selectedIndustryIds', saved_industries,
    'skills', saved_skills,
    'rateReady', private.worker_has_service_rate(worker.account_id)
  );
end
$$;

revoke all on function public.get_my_worker_skills()
from public, anon;
grant execute on function public.get_my_worker_skills()
to authenticated;

notify pgrst, 'reload schema';

commit;
