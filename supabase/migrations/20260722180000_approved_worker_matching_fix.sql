begin;

create or replace function private.worker_match_eligibility(p_service_request_id uuid)
returns table(
  worker_id uuid,
  account_eligible boolean,
  skill_match boolean,
  approved boolean,
  service_area_ready boolean,
  within_radius boolean,
  schedule_match boolean,
  online boolean,
  eligible boolean,
  distance_meters double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  with request as (
    select service_request.*
    from public.service_requests service_request
    where service_request.id = p_service_request_id
  ), checks as (
    select
      worker.account_id as worker_id,
      (
        account.role = 'WORKER'
        and account.status = 'ACTIVE'
        and account.deleted_at is null
      ) as account_eligible,
      exists (
        select 1
        from public.worker_skills skill
        join public.service_categories category on category.id = skill.category_id
        where skill.worker_id = worker.account_id
          and skill.category_id = request.category_id
          and category.is_active
      ) as skill_match,
      worker.approval_status = 'APPROVED' as approved,
      (
        worker.service_origin is not null
        and worker.service_radius_meters is not null
      ) as service_area_ready,
      case
        when worker.service_origin is null or worker.service_radius_meters is null then false
        else extensions.st_dwithin(
          worker.service_origin,
          request.service_location,
          worker.service_radius_meters
        )
      end as within_radius,
      exists (
        select 1
        from public.worker_availability availability
        where availability.worker_id = worker.account_id
          and availability.day_of_week = extract(
            dow from request.scheduled_at at time zone 'Asia/Manila'
          )::integer
          and (request.scheduled_at at time zone 'Asia/Manila')::time
            between availability.start_time and availability.end_time
      ) as schedule_match,
      worker.is_available as online,
      case
        when worker.service_origin is null then null
        else extensions.st_distance(worker.service_origin, request.service_location)
      end as distance_meters
    from request
    cross join public.worker_profiles worker
    left join public.accounts account on account.id = worker.account_id
  )
  select
    checks.worker_id,
    checks.account_eligible,
    checks.skill_match,
    checks.approved,
    checks.service_area_ready,
    checks.within_radius,
    checks.schedule_match,
    checks.online,
    checks.account_eligible
      and checks.skill_match
      and checks.approved
      and checks.service_area_ready
      and checks.within_radius
      and checks.schedule_match
      and checks.online as eligible,
    checks.distance_meters
  from checks
$$;

revoke all on function private.worker_match_eligibility(uuid) from public, anon, authenticated;

create or replace function public.get_my_worker_matching_readiness()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  worker public.worker_profiles;
  account public.accounts;
  skill_count integer;
  schedule_count integer;
  schedule jsonb;
begin
  select * into account
  from public.accounts
  where id = auth.uid();

  if account.id is null or account.role <> 'WORKER' or account.deleted_at is not null then
    raise exception using errcode = '42501', message = 'WORKER_ROLE_REQUIRED';
  end if;

  select * into worker
  from public.worker_profiles
  where account_id = auth.uid();

  if worker.account_id is null then
    raise exception using errcode = 'P0002', message = 'WORKER_PROFILE_NOT_FOUND';
  end if;

  select count(*) into skill_count
  from public.worker_skills skill
  join public.service_categories category on category.id = skill.category_id
  where skill.worker_id = worker.account_id and category.is_active;

  select
    count(*),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'dayOfWeek', availability.day_of_week,
          'startTime', to_char(availability.start_time, 'HH24:MI'),
          'endTime', to_char(availability.end_time, 'HH24:MI'),
          'timezone', availability.timezone
        ) order by availability.day_of_week
      ),
      '[]'::jsonb
    )
  into schedule_count, schedule
  from public.worker_availability availability
  where availability.worker_id = worker.account_id;

  return jsonb_build_object(
    'accountEligible', account.status = 'ACTIVE',
    'verificationStatus', worker.approval_status,
    'skillsReady', skill_count > 0,
    'serviceAreaReady', worker.service_origin is not null and worker.service_radius_meters is not null,
    'scheduleReady', schedule_count > 0,
    'online', worker.is_available,
    'setupComplete',
      account.status = 'ACTIVE'
      and worker.approval_status = 'APPROVED'
      and skill_count > 0
      and worker.service_origin is not null
      and worker.service_radius_meters is not null
      and schedule_count > 0,
    'matchable',
      account.status = 'ACTIVE'
      and worker.approval_status = 'APPROVED'
      and skill_count > 0
      and worker.service_origin is not null
      and worker.service_radius_meters is not null
      and schedule_count > 0
      and worker.is_available,
    'latitude', case when worker.service_origin is null then null else round(extensions.st_y(worker.service_origin::extensions.geometry)::numeric, 6) end,
    'longitude', case when worker.service_origin is null then null else round(extensions.st_x(worker.service_origin::extensions.geometry)::numeric, 6) end,
    'serviceArea', worker.service_area,
    'radiusMeters', worker.service_radius_meters,
    'schedule', schedule
  );
end
$$;

create or replace function public.save_my_worker_matching_setup(
  p_latitude numeric,
  p_longitude numeric,
  p_radius_meters integer,
  p_service_area text,
  p_schedule jsonb,
  p_online boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  worker public.worker_profiles;
  schedule_count integer;
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

  if p_latitude not between -90 and 90
    or p_longitude not between -180 and 180
    or p_radius_meters not between 100 and 200000
    or length(btrim(coalesce(p_service_area, ''))) not between 2 and 200
    or jsonb_typeof(p_schedule) is distinct from 'array'
    or jsonb_array_length(p_schedule) not between 1 and 7
  then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_MATCHING_SETUP';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_schedule) entry
    where jsonb_typeof(entry) is distinct from 'object'
      or coalesce(entry->>'dayOfWeek', '') !~ '^[0-6]$'
      or coalesce(entry->>'startTime', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or coalesce(entry->>'endTime', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or (entry->>'startTime')::time >= (entry->>'endTime')::time
  ) then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_SCHEDULE';
  end if;

  select count(distinct (entry->>'dayOfWeek')::integer)
  into schedule_count
  from jsonb_array_elements(p_schedule) entry;

  if schedule_count <> jsonb_array_length(p_schedule) then
    raise exception using errcode = '22023', message = 'DUPLICATE_WORKER_SCHEDULE_DAY';
  end if;

  select * into worker
  from public.worker_profiles
  where account_id = auth.uid()
  for update;

  if worker.account_id is null then
    raise exception using errcode = 'P0002', message = 'WORKER_PROFILE_NOT_FOUND';
  end if;

  if p_online and (
    worker.approval_status <> 'APPROVED'
    or not exists (
      select 1
      from public.worker_skills skill
      join public.service_categories category on category.id = skill.category_id
      where skill.worker_id = worker.account_id and category.is_active
    )
  ) then
    raise exception using errcode = '55000', message = 'WORKER_NOT_READY';
  end if;

  delete from public.worker_availability
  where worker_id = worker.account_id;

  insert into public.worker_availability(
    worker_id,
    day_of_week,
    start_time,
    end_time,
    timezone
  )
  select
    worker.account_id,
    (entry->>'dayOfWeek')::smallint,
    (entry->>'startTime')::time,
    (entry->>'endTime')::time,
    'Asia/Manila'
  from jsonb_array_elements(p_schedule) entry;

  update public.worker_profiles
  set service_origin = private.make_location(p_latitude, p_longitude),
      service_radius_meters = p_radius_meters,
      service_area = btrim(p_service_area),
      is_available = p_online,
      updated_at = now()
  where account_id = worker.account_id;

  return public.get_my_worker_matching_readiness();
end
$$;

create or replace function public.get_match_diagnostics(p_service_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  request public.service_requests;
  category_name text;
  active_workers bigint;
  skilled_workers bigint;
  approved_workers bigint;
  configured_workers bigint;
  nearby_workers bigint;
  scheduled_workers bigint;
  online_workers bigint;
  reason_code text;
begin
  select * into request
  from public.service_requests
  where id = p_service_request_id;

  if request.id is null or request.user_account_id is distinct from auth.uid() then
    raise exception using errcode = '42501', message = 'SERVICE_REQUEST_UNAVAILABLE';
  end if;

  select name into category_name
  from public.service_categories
  where id = request.category_id;

  select
    count(*) filter (where eligibility.account_eligible),
    count(*) filter (where eligibility.account_eligible and eligibility.skill_match),
    count(*) filter (where eligibility.account_eligible and eligibility.skill_match and eligibility.approved),
    count(*) filter (where eligibility.account_eligible and eligibility.skill_match and eligibility.approved and eligibility.service_area_ready),
    count(*) filter (where eligibility.account_eligible and eligibility.skill_match and eligibility.approved and eligibility.service_area_ready and eligibility.within_radius),
    count(*) filter (where eligibility.account_eligible and eligibility.skill_match and eligibility.approved and eligibility.service_area_ready and eligibility.within_radius and eligibility.schedule_match),
    count(*) filter (where eligibility.eligible)
  into active_workers, skilled_workers, approved_workers, configured_workers,
    nearby_workers, scheduled_workers, online_workers
  from private.worker_match_eligibility(request.id) eligibility;

  reason_code := case
    when active_workers = 0 then 'NO_ACTIVE_WORKERS'
    when skilled_workers = 0 then 'NO_CATEGORY_WORKERS'
    when approved_workers = 0 then 'NO_APPROVED_WORKERS'
    when configured_workers = 0 then 'WORKERS_MISSING_SERVICE_AREA'
    when nearby_workers = 0 then 'OUTSIDE_SERVICE_RADIUS'
    when scheduled_workers = 0 then 'OUTSIDE_WORKING_HOURS'
    when online_workers = 0 then 'WORKERS_OFFLINE'
    else 'NO_MATCHES'
  end;

  return jsonb_build_object(
    'serviceRequestId', request.id,
    'category', category_name,
    'reasonCode', reason_code,
    'counts', jsonb_build_object(
      'active', active_workers,
      'skilled', skilled_workers,
      'approved', approved_workers,
      'configured', configured_workers,
      'nearby', nearby_workers,
      'scheduled', scheduled_workers,
      'online', online_workers
    )
  );
end
$$;

create or replace function public.generate_matches(p_service_request_id uuid)
returns setof public.match_candidates
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.service_requests;
  weights jsonb;
  matched_count integer;
begin
  select * into request
  from public.service_requests
  where id = p_service_request_id
  for update;

  if request.id is null
    or request.user_account_id is distinct from auth.uid()
    or request.status not in ('OPEN', 'MATCHED')
  then
    raise exception using errcode = '42501', message = 'Service request unavailable';
  end if;

  select value into weights
  from public.system_settings
  where key = 'matching.weights';
  weights := coalesce(
    weights,
    '{"distance":0.30,"availability":0.20,"rating":0.20,"completed_jobs":0.10,"response_history":0.10,"cancellation_history":0.05,"priority":0.05}'::jsonb
  );

  delete from public.match_candidates
  where service_request_id = request.id;

  insert into public.match_candidates(
    service_request_id,
    worker_id,
    score,
    rank,
    factors,
    eligible
  )
  with candidates as (
    select
      worker.account_id as worker_id,
      skill.years,
      worker.recommendation_priority,
      eligibility.distance_meters,
      coalesce(avg(review.stars) filter (where review.moderation_status = 'PUBLISHED'), 0) as rating,
      count(distinct booking.id) filter (where booking.status = 'COMPLETED') as completed_jobs,
      coalesce(
        count(distinct booking.id) filter (where booking.accepted_at is not null)::numeric
          / nullif(count(distinct booking.id), 0),
        1
      ) as response_rate,
      coalesce(
        count(distinct booking.id) filter (where booking.status = 'CANCELLED')::numeric
          / nullif(count(distinct booking.id), 0),
        0
      ) as cancellation_rate
    from private.worker_match_eligibility(request.id) eligibility
    join public.worker_profiles worker on worker.account_id = eligibility.worker_id
    join public.worker_skills skill
      on skill.worker_id = worker.account_id
      and skill.category_id = request.category_id
    left join public.reviews review on review.worker_account_id = worker.account_id
    left join public.bookings booking on booking.worker_account_id = worker.account_id
    where eligibility.eligible
    group by
      worker.account_id,
      skill.years,
      worker.recommendation_priority,
      eligibility.distance_meters
  ), scored as (
    select
      candidates.*,
      round((
        greatest(0, 100 - (distance_meters / 1000) * 5) * (weights->>'distance')::numeric
        + 100 * (weights->>'availability')::numeric
        + (rating / 5 * 100) * (weights->>'rating')::numeric
        + least(completed_jobs * 5, 100) * (weights->>'completed_jobs')::numeric
        + response_rate * 100 * (weights->>'response_history')::numeric
        + (1 - cancellation_rate) * 100 * (weights->>'cancellation_history')::numeric
        + (case when recommendation_priority then 100 else 0 end) * (weights->>'priority')::numeric
      )::numeric, 4) as total_score
    from candidates
  ), ranked as (
    select
      scored.*,
      row_number() over(order by total_score desc, worker_id)::integer as candidate_rank
    from scored
  )
  select
    request.id,
    worker_id,
    total_score,
    candidate_rank,
    jsonb_build_object(
      'category', true,
      'available', true,
      'years', years,
      'rating', rating,
      'completed_jobs', completed_jobs,
      'response_rate', response_rate,
      'cancellation_rate', cancellation_rate,
      'distance_meters', round(distance_meters::numeric, 2),
      'recommendation_priority', recommendation_priority,
      'weights', weights
    ),
    true
  from ranked
  where candidate_rank <= 5;

  get diagnostics matched_count = row_count;
  if matched_count > 0 then
    update public.service_requests set status = 'MATCHED' where id = request.id;
  else
    perform pgmq.send(
      'no_match_notifications',
      jsonb_build_object(
        'service_request_id', request.id,
        'user_account_id', request.user_account_id
      ),
      300
    );
  end if;

  return query
  select candidate.*
  from public.match_candidates candidate
  where candidate.service_request_id = request.id
  order by candidate.rank;
end
$$;

create or replace function public.admin_set_worker_availability(
  p_worker_id uuid,
  p_available boolean
)
returns public.worker_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.worker_profiles;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  if p_available and not exists (
    select 1
    from public.worker_profiles worker
    join public.accounts account on account.id = worker.account_id
    where worker.account_id = p_worker_id
      and account.role = 'WORKER'
      and account.status = 'ACTIVE'
      and account.deleted_at is null
      and worker.approval_status = 'APPROVED'
      and worker.service_origin is not null
      and worker.service_radius_meters is not null
      and exists (
        select 1 from public.worker_skills skill
        where skill.worker_id = worker.account_id
      )
      and exists (
        select 1 from public.worker_availability availability
        where availability.worker_id = worker.account_id
      )
  ) then
    raise exception using errcode = '55000', message = 'WORKER_NOT_READY';
  end if;

  update public.worker_profiles
  set is_available = p_available,
      updated_at = now()
  where account_id = p_worker_id
  returning * into result;

  if result.account_id is null then
    raise exception using errcode = 'P0002', message = 'WORKER_NOT_FOUND';
  end if;
  return result;
end
$$;

revoke all on function public.get_my_worker_matching_readiness() from public, anon;
revoke all on function public.save_my_worker_matching_setup(numeric, numeric, integer, text, jsonb, boolean) from public, anon;
revoke all on function public.get_match_diagnostics(uuid) from public, anon;
revoke all on function public.admin_set_worker_availability(uuid, boolean) from public, anon;

grant execute on function public.get_my_worker_matching_readiness() to authenticated;
grant execute on function public.save_my_worker_matching_setup(numeric, numeric, integer, text, jsonb, boolean) to authenticated;
grant execute on function public.get_match_diagnostics(uuid) to authenticated;
grant execute on function public.admin_set_worker_availability(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';

commit;
