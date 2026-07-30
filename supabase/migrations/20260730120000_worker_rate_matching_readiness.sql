begin;

create or replace function private.worker_has_service_rate(p_worker_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.worker_skills skill
    join public.service_categories category on category.id = skill.category_id
    where skill.worker_id = p_worker_id
      and category.is_active
      and skill.rate_minor is not null
  )
$$;

revoke all on function private.worker_has_service_rate(uuid)
from public, anon, authenticated;

create or replace function private.worker_match_eligibility(
  p_service_request_id uuid
)
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
  ),
  checks as (
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
        join public.service_categories category
          on category.id = skill.category_id
        where skill.worker_id = worker.account_id
          and skill.category_id = request.category_id
          and category.is_active
      ) as skill_match,
      exists (
        select 1
        from public.worker_skills skill
        where skill.worker_id = worker.account_id
          and skill.category_id = request.category_id
          and skill.rate_minor is not null
          and skill.rate_minor <= round(request.budget * 100)
      ) as rate_eligible,
      worker.approval_status = 'APPROVED' as approved,
      (
        worker.service_origin is not null
        and worker.service_radius_meters is not null
      ) as service_area_ready,
      case
        when worker.service_origin is null
          or worker.service_radius_meters is null
        then false
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
      not private.accounts_block_each_other(
        request.user_account_id,
        worker.account_id
      ) as not_blocked,
      case
        when worker.service_origin is null then null
        else extensions.st_distance(
          worker.service_origin,
          request.service_location
        )
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
      and checks.rate_eligible
      and checks.approved
      and checks.service_area_ready
      and checks.within_radius
      and checks.schedule_match
      and checks.online
      and checks.not_blocked as eligible,
    checks.distance_meters
  from checks
$$;

revoke all on function private.worker_match_eligibility(uuid)
from public, anon, authenticated;

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
  rate_ready boolean;
  schedule_count integer;
  schedule jsonb;
begin
  select *
  into account
  from public.accounts
  where id = auth.uid();

  if account.id is null
    or account.role <> 'WORKER'
    or account.deleted_at is not null
  then
    raise exception using errcode = '42501', message = 'WORKER_ROLE_REQUIRED';
  end if;

  select *
  into worker
  from public.worker_profiles
  where account_id = auth.uid();

  if worker.account_id is null then
    raise exception using errcode = 'P0002', message = 'WORKER_PROFILE_NOT_FOUND';
  end if;

  select count(*)
  into skill_count
  from public.worker_skills skill
  join public.service_categories category on category.id = skill.category_id
  where skill.worker_id = worker.account_id
    and category.is_active;

  rate_ready := private.worker_has_service_rate(worker.account_id);

  select
    count(*),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'dayOfWeek', availability.day_of_week,
          'startTime', to_char(availability.start_time, 'HH24:MI'),
          'endTime', to_char(availability.end_time, 'HH24:MI'),
          'timezone', availability.timezone
        )
        order by availability.day_of_week
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
    'rateReady', rate_ready,
    'serviceAreaReady',
      worker.service_origin is not null
      and worker.service_radius_meters is not null,
    'scheduleReady', schedule_count > 0,
    'online', worker.is_available,
    'setupComplete',
      account.status = 'ACTIVE'
      and worker.approval_status = 'APPROVED'
      and skill_count > 0
      and rate_ready
      and worker.service_origin is not null
      and worker.service_radius_meters is not null
      and schedule_count > 0,
    'matchable',
      account.status = 'ACTIVE'
      and worker.approval_status = 'APPROVED'
      and skill_count > 0
      and rate_ready
      and worker.service_origin is not null
      and worker.service_radius_meters is not null
      and schedule_count > 0
      and worker.is_available,
    'latitude',
      case
        when worker.service_origin is null then null
        else round(
          extensions.st_y(worker.service_origin::extensions.geometry)::numeric,
          6
        )
      end,
    'longitude',
      case
        when worker.service_origin is null then null
        else round(
          extensions.st_x(worker.service_origin::extensions.geometry)::numeric,
          6
        )
      end,
    'serviceArea', worker.service_area,
    'radiusMeters', worker.service_radius_meters,
    'serviceRadiusMeters', worker.service_radius_meters,
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
    raise exception using
      errcode = '22023',
      message = 'INVALID_WORKER_MATCHING_SETUP';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_schedule) entry
    where jsonb_typeof(entry) is distinct from 'object'
      or coalesce(entry->>'dayOfWeek', '') !~ '^[0-6]$'
      or coalesce(entry->>'startTime', '') !~
        '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or coalesce(entry->>'endTime', '') !~
        '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or (entry->>'startTime')::time >= (entry->>'endTime')::time
  ) then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_SCHEDULE';
  end if;

  select count(distinct (entry->>'dayOfWeek')::integer)
  into schedule_count
  from jsonb_array_elements(p_schedule) entry;

  if schedule_count <> jsonb_array_length(p_schedule) then
    raise exception using
      errcode = '22023',
      message = 'DUPLICATE_WORKER_SCHEDULE_DAY';
  end if;

  select *
  into worker
  from public.worker_profiles
  where account_id = auth.uid()
  for update;

  if worker.account_id is null then
    raise exception using errcode = 'P0002', message = 'WORKER_PROFILE_NOT_FOUND';
  end if;

  if p_online
    and (
      worker.approval_status <> 'APPROVED'
      or not exists (
        select 1
        from public.worker_skills skill
        join public.service_categories category
          on category.id = skill.category_id
        where skill.worker_id = worker.account_id
          and category.is_active
      )
      or not private.worker_has_service_rate(worker.account_id)
    )
  then
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

create or replace function public.update_worker_presence(
  p_latitude numeric,
  p_longitude numeric,
  p_accuracy_meters numeric default null,
  p_online boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_accuracy numeric(8, 2);
begin
  if p_latitude is null
    or p_longitude is null
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180
  then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_LOCATION';
  end if;

  if not exists (
    select 1
    from public.worker_profiles worker
    join public.accounts account on account.id = worker.account_id
    where worker.account_id = auth.uid()
      and account.role = 'WORKER'
      and account.status = 'ACTIVE'
      and account.deleted_at is null
      and worker.approval_status = 'APPROVED'
      and (
        not p_online
        or (
          worker.is_available
          and worker.service_origin is not null
          and worker.service_radius_meters is not null
          and private.worker_has_service_rate(worker.account_id)
          and exists (
            select 1
            from public.worker_availability availability
            where availability.worker_id = worker.account_id
          )
        )
      )
  ) then
    raise exception using errcode = '42501', message = 'WORKER_NOT_READY';
  end if;

  safe_accuracy := case
    when p_accuracy_meters is null
      or p_accuracy_meters < 0
      or p_accuracy_meters > 10000
      or p_accuracy_meters::text in ('NaN', 'Infinity', '-Infinity')
    then null
    else round(p_accuracy_meters, 2)
  end;

  insert into public.worker_presence(
    worker_id,
    location,
    accuracy_meters,
    online,
    last_seen_at
  )
  values(
    auth.uid(),
    private.make_location(p_latitude, p_longitude),
    safe_accuracy,
    p_online,
    now()
  )
  on conflict(worker_id) do update
  set location = excluded.location,
      accuracy_meters = excluded.accuracy_meters,
      online = excluded.online,
      last_seen_at = now(),
      updated_at = now();

  return jsonb_build_object(
    'online', p_online,
    'lastSeenAt', now(),
    'accuracyMeters', safe_accuracy
  );
end
$$;

create or replace function public.respond_to_dispatch(
  p_dispatch_id uuid,
  p_response text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  dispatch public.service_request_dispatches;
begin
  if p_response not in ('ACCEPTED', 'DECLINED') then
    raise exception using
      errcode = '22023',
      message = 'INVALID_DISPATCH_RESPONSE';
  end if;

  select *
  into dispatch
  from public.service_request_dispatches offer
  where offer.id = p_dispatch_id
    and offer.worker_id = auth.uid()
    and offer.status in ('OFFERED', 'VIEWED')
    and offer.expires_at > now()
  for update;

  if dispatch.id is null then
    raise exception using
      errcode = 'P0001',
      message = 'DISPATCH_OFFER_UNAVAILABLE';
  end if;

  if p_response = 'ACCEPTED'
    and not exists (
      select 1
      from private.worker_match_eligibility(
        dispatch.service_request_id
      ) eligibility
      where eligibility.worker_id = dispatch.worker_id
        and eligibility.eligible
    )
  then
    raise exception using errcode = '55000', message = 'WORKER_NOT_READY';
  end if;

  update public.service_request_dispatches
  set status = p_response,
      responded_at = now(),
      updated_at = now()
  where id = dispatch.id
  returning * into dispatch;

  if p_response = 'DECLINED' then
    perform private.refresh_live_dispatch(dispatch.service_request_id);
  end if;

  return jsonb_build_object(
    'dispatchId', dispatch.id,
    'status', dispatch.status
  );
end
$$;

create or replace function private.require_worker_ready_for_booking_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'PENDING'
    and new.status = 'ACCEPTED'
    and not exists (
      select 1
      from private.worker_match_eligibility(
        new.service_request_id
      ) eligibility
      where eligibility.worker_id = new.worker_account_id
        and eligibility.eligible
    )
  then
    raise exception using errcode = '55000', message = 'WORKER_NOT_READY';
  end if;

  return new;
end
$$;

revoke all on function private.require_worker_ready_for_booking_acceptance()
from public, anon, authenticated;

drop trigger if exists require_worker_ready_for_booking_acceptance
on public.bookings;
create trigger require_worker_ready_for_booking_acceptance
before update of status on public.bookings
for each row
execute function private.require_worker_ready_for_booking_acceptance();

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

  if p_available
    and not exists (
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
        and private.worker_has_service_rate(worker.account_id)
        and exists (
          select 1
          from public.worker_availability availability
          where availability.worker_id = worker.account_id
        )
    )
  then
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

revoke all on function public.get_my_worker_matching_readiness()
from public, anon;
revoke all on function public.save_my_worker_matching_setup(
  numeric,
  numeric,
  integer,
  text,
  jsonb,
  boolean
)
from public, anon;
revoke all on function public.update_worker_presence(
  numeric,
  numeric,
  numeric,
  boolean
)
from public, anon;
revoke all on function public.respond_to_dispatch(uuid, text)
from public, anon;
revoke all on function public.admin_set_worker_availability(uuid, boolean)
from public, anon;

grant execute on function public.get_my_worker_matching_readiness()
to authenticated;
grant execute on function public.save_my_worker_matching_setup(
  numeric,
  numeric,
  integer,
  text,
  jsonb,
  boolean
)
to authenticated;
grant execute on function public.update_worker_presence(
  numeric,
  numeric,
  numeric,
  boolean
)
to authenticated;
grant execute on function public.respond_to_dispatch(uuid, text)
to authenticated;
grant execute on function public.admin_set_worker_availability(uuid, boolean)
to authenticated;

notify pgrst, 'reload schema';

commit;
