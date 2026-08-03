begin;

create or replace function public.get_my_worker_skills()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  worker public.worker_profiles;
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
