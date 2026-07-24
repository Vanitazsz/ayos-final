-- ============================================================
-- CONSOLIDATED DEPLOYMENT: Live Dispatch + Worker Matching
-- Generated 2026-07-24
-- ============================================================
-- Run this entire file in your Supabase SQL Dashboard to
-- deploy all missing live-dispatch and worker-matching objects.
-- All statements use CREATE OR REPLACE / IF NOT EXISTS so
-- running this multiple times is safe.
-- ============================================================

begin;

-- ---------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------

create table if not exists public.worker_presence (
  worker_id uuid primary key references public.worker_profiles(account_id) on delete cascade,
  location extensions.geography(point, 4326) not null,
  accuracy_meters numeric(8,2),
  online boolean not null default true,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (accuracy_meters is null or accuracy_meters between 0 and 10000)
);
create index if not exists worker_presence_live_idx on public.worker_presence(online, last_seen_at desc);
create index if not exists worker_presence_location_gix on public.worker_presence using gist(location);

create table if not exists public.live_dispatch_sessions (
  service_request_id uuid primary key references public.service_requests(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '2 minutes')
);

create table if not exists public.service_request_dispatches (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(account_id) on delete cascade,
  status text not null default 'OFFERED' check (status in ('OFFERED','VIEWED','ACCEPTED','DECLINED','EXPIRED','SELECTED')),
  wave smallint not null check (wave between 1 and 3),
  distance_meters numeric(12,2) not null check (distance_meters >= 0),
  approximate_latitude numeric(9,6) not null,
  approximate_longitude numeric(9,6) not null,
  offered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  viewed_at timestamptz,
  responded_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(service_request_id, worker_id)
);
create index if not exists dispatch_request_status_idx on public.service_request_dispatches(service_request_id,status,distance_meters);
create index if not exists dispatch_worker_status_idx on public.service_request_dispatches(worker_id,status,expires_at);

-- ---------------------------------------------------------
-- 2. ROW LEVEL SECURITY
-- ---------------------------------------------------------

alter table public.worker_presence enable row level security;
alter table public.live_dispatch_sessions enable row level security;
alter table public.service_request_dispatches enable row level security;

revoke all on public.worker_presence, public.live_dispatch_sessions, public.service_request_dispatches from anon, authenticated;
grant select on public.worker_presence, public.live_dispatch_sessions, public.service_request_dispatches to authenticated;

drop policy if exists worker_presence_owner_read on public.worker_presence;
create policy worker_presence_owner_read on public.worker_presence for select to authenticated
using(worker_id=auth.uid() or public.is_admin(false));

drop policy if exists live_dispatch_session_owner_read on public.live_dispatch_sessions;
create policy live_dispatch_session_owner_read on public.live_dispatch_sessions for select to authenticated
using(exists(select 1 from public.service_requests r where r.id=service_request_id and r.user_account_id=auth.uid()) or public.is_admin(false));

drop policy if exists dispatch_participant_read on public.service_request_dispatches;
create policy dispatch_participant_read on public.service_request_dispatches for select to authenticated
using(worker_id=auth.uid() or exists(select 1 from public.service_requests r where r.id=service_request_id and r.user_account_id=auth.uid()) or public.is_admin(false));

-- ---------------------------------------------------------
-- 3. PRIVATE FUNCTIONS
-- ---------------------------------------------------------

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

create or replace function private.refresh_live_dispatch(p_service_request_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
  req public.service_requests;
  started timestamptz;
  dispatch_expires timestamptz;
  wave smallint;
begin
  select * into req from public.service_requests where id=p_service_request_id;
  select started_at,expires_at into started,dispatch_expires
  from public.live_dispatch_sessions where service_request_id=p_service_request_id;
  if req.id is null or started is null then return; end if;

  wave := case
    when extract(epoch from(now()-started))>=60 then 3
    when extract(epoch from(now()-started))>=30 then 2
    else 1
  end;

  update public.service_request_dispatches
  set status='EXPIRED',updated_at=now()
  where service_request_id=req.id
    and status in ('OFFERED','VIEWED','ACCEPTED')
    and (expires_at<=now() or dispatch_expires<=now());

  if dispatch_expires<=now() then return; end if;

  insert into public.service_request_dispatches(
    service_request_id,worker_id,status,wave,distance_meters,
    approximate_latitude,approximate_longitude,expires_at
  )
  select
    req.id,
    wp.account_id,
    'OFFERED',
    wave,
    round(extensions.st_distance(p.location,req.service_location))::integer,
    round((extensions.st_y(p.location::extensions.geometry)
      + ((hashtextextended(req.id::text||wp.account_id::text,0)%120-60)::numeric/10000))::numeric,3),
    round((extensions.st_x(p.location::extensions.geometry)
      + ((hashtextextended(wp.account_id::text||req.id::text,0)%120-60)::numeric/10000))::numeric,3),
    dispatch_expires
  from public.worker_profiles wp
  join public.accounts a on a.id=wp.account_id
  join public.worker_presence p on p.worker_id=wp.account_id
  where a.status='ACTIVE'
    and wp.approval_status='APPROVED'
    and wp.is_available
    and p.online
    and p.last_seen_at>now()-interval '30 seconds'
    and extensions.st_distance(p.location,req.service_location)<=
      case wave
        when 1 then least(5000,coalesce(wp.service_radius_meters,5000))
        when 2 then least(10000,coalesce(wp.service_radius_meters,10000))
        else coalesce(wp.service_radius_meters,10000)
      end
    and exists(
      select 1 from public.worker_availability av
      where av.worker_id=wp.account_id
        and av.day_of_week=extract(dow from req.scheduled_at at time zone av.timezone)::smallint
        and (req.scheduled_at at time zone av.timezone)::time between av.start_time and av.end_time
    )
  on conflict(service_request_id,worker_id) do update
  set wave=greatest(public.service_request_dispatches.wave,excluded.wave),
      distance_meters=excluded.distance_meters,
      approximate_latitude=excluded.approximate_latitude,
      approximate_longitude=excluded.approximate_longitude,
      updated_at=now()
  where public.service_request_dispatches.status in ('OFFERED','VIEWED');
end
$$;

revoke all on function private.refresh_live_dispatch(uuid) from public, anon, authenticated;

create or replace function private.live_dispatch_diagnostics(
  p_service_request_id uuid,
  p_wave smallint
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  request public.service_requests;
  result jsonb;
begin
  select * into request from public.service_requests where id=p_service_request_id;
  with eligibility as (
    select
      wp.account_id,
      (a.status='ACTIVE') as active,
      (wp.approval_status='APPROVED') as approved,
      wp.is_available as available,
      (presence.online and presence.last_seen_at>now()-interval '30 seconds') as fresh_presence,
      (
        presence.location is not null
        and extensions.st_distance(presence.location,request.service_location)<=
          case p_wave
            when 1 then least(5000,coalesce(wp.service_radius_meters,5000))
            when 2 then least(10000,coalesce(wp.service_radius_meters,10000))
            else coalesce(wp.service_radius_meters,10000)
          end
      ) as within_wave,
      exists(
        select 1 from public.worker_availability av
        where av.worker_id=wp.account_id
          and av.day_of_week=extract(dow from request.scheduled_at at time zone av.timezone)::smallint
          and (request.scheduled_at at time zone av.timezone)::time between av.start_time and av.end_time
      ) as scheduled
    from public.worker_profiles wp
    join public.accounts a on a.id=wp.account_id
    left join public.worker_presence presence on presence.worker_id=wp.account_id
  ), counts as (
    select
      count(*) filter(where active) active_count,
      count(*) filter(where active and approved) approved_count,
      count(*) filter(where active and approved and available) available_count,
      count(*) filter(where active and approved and available and fresh_presence) fresh_count,
      count(*) filter(where active and approved and available and fresh_presence and within_wave) wave_count,
      count(*) filter(where active and approved and available and fresh_presence and within_wave and scheduled) scheduled_count
    from eligibility
  )
  select jsonb_build_object(
    'reasonCode',case
      when active_count=0 then 'NO_ACTIVE_WORKERS'
      when approved_count=0 then 'NO_APPROVED_WORKERS'
      when available_count=0 then 'WORKERS_OFFLINE'
      when fresh_count=0 then 'NO_FRESH_PRESENCE'
      when wave_count=0 then 'OUTSIDE_SEARCH_RADIUS'
      when scheduled_count=0 then 'OUTSIDE_WORKING_HOURS'
      else 'WAITING_FOR_RESPONSE'
    end,
    'counts',jsonb_build_object(
      'active',active_count,
      'skilled',active_count,
      'approved',approved_count,
      'available',available_count,
      'freshPresence',fresh_count,
      'withinWave',wave_count,
      'scheduled',scheduled_count,
      'subdivisionCompatible',wave_count
    )
  ) into result from counts;
  return result;
end
$$;

-- ---------------------------------------------------------
-- 4. PUBLIC FUNCTIONS
-- ---------------------------------------------------------

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
  safe_accuracy numeric(8,2);
begin
  if p_latitude is null or p_longitude is null
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180
  then
    raise exception using errcode='22023', message='INVALID_WORKER_LOCATION';
  end if;

  if not exists(
    select 1
    from public.worker_profiles wp
    join public.accounts a on a.id=wp.account_id
    where wp.account_id=auth.uid()
      and a.status='ACTIVE'
      and wp.approval_status='APPROVED'
  ) then
    raise exception using errcode='42501', message='WORKER_NOT_READY';
  end if;

  safe_accuracy := case
    when p_accuracy_meters is null
      or p_accuracy_meters < 0
      or p_accuracy_meters > 10000
      or p_accuracy_meters::text in ('NaN','Infinity','-Infinity')
    then null
    else round(p_accuracy_meters, 2)
  end;

  insert into public.worker_presence(
    worker_id, location, accuracy_meters, online, last_seen_at
  )
  values(
    auth.uid(),
    private.make_location(p_latitude,p_longitude),
    safe_accuracy,
    p_online,
    now()
  )
  on conflict(worker_id) do update
  set location=excluded.location,
      accuracy_meters=excluded.accuracy_meters,
      online=excluded.online,
      last_seen_at=now(),
      updated_at=now();

  return jsonb_build_object(
    'online',p_online,
    'lastSeenAt',now(),
    'accuracyMeters',safe_accuracy
  );
end
$$;

grant execute on function public.update_worker_presence(numeric,numeric,numeric,boolean) to authenticated;

create or replace function public.start_live_dispatch(
  p_service_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path='' as $$
begin
  if not exists(
    select 1
    from public.service_requests request
    where request.id=p_service_request_id
      and request.user_account_id=auth.uid()
      and request.status in ('OPEN','MATCHED')
  ) then
    raise exception using
      errcode='42501',
      message='SERVICE_REQUEST_UNAVAILABLE';
  end if;

  insert into public.live_dispatch_sessions(
    service_request_id,
    started_at,
    expires_at
  )
  values(
    p_service_request_id,
    now(),
    now()+interval '2 minutes'
  )
  on conflict(service_request_id) do update
  set started_at=case
        when public.live_dispatch_sessions.expires_at<=now()
        then excluded.started_at
        else public.live_dispatch_sessions.started_at
      end,
      expires_at=case
        when public.live_dispatch_sessions.expires_at<=now()
        then excluded.expires_at
        else public.live_dispatch_sessions.expires_at
      end;

  perform private.refresh_live_dispatch(p_service_request_id);
  return public.get_live_dispatch_snapshot(p_service_request_id);
end
$$;

revoke all on function public.start_live_dispatch(uuid) from public,anon;
grant execute on function public.start_live_dispatch(uuid) to authenticated;

create or replace function public.get_live_dispatch_snapshot(p_service_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare req public.service_requests; started timestamptz; dispatch_expires timestamptz; current_wave smallint; result jsonb;
begin
  select * into req from public.service_requests where id=p_service_request_id;
  if req.id is null or req.user_account_id<>auth.uid() then raise exception using errcode='42501',message='SERVICE_REQUEST_UNAVAILABLE'; end if;
  perform private.refresh_live_dispatch(req.id);
  select started_at,expires_at into started,dispatch_expires from public.live_dispatch_sessions where service_request_id=req.id;
  if started is null then raise exception using errcode='P0001',message='LIVE_DISPATCH_NOT_STARTED'; end if;
  current_wave:=case when extract(epoch from(now()-started))>=60 then 3 when extract(epoch from(now()-started))>=30 then 2 else 1 end;
  select jsonb_build_object('serviceRequestId',req.id,'startedAt',started,'expiresAt',dispatch_expires,'wave',current_wave,
    'diagnostics',private.live_dispatch_diagnostics(req.id,current_wave),
    'candidates',coalesce(jsonb_agg(jsonb_build_object('dispatchId',dispatch.id,'workerId',dispatch.worker_id,'status',dispatch.status,
      'name',worker.display_name,'avatar',worker.avatar_path,'distanceMeters',dispatch.distance_meters,'latitude',dispatch.approximate_latitude,
      'longitude',dispatch.approximate_longitude,'rating',coalesce(stats.rating,0),'reviewCount',coalesce(stats.review_count,0))
      order by(dispatch.status='ACCEPTED') desc,dispatch.distance_meters) filter(where dispatch.id is not null),'[]'::jsonb))
  into result from public.service_request_dispatches dispatch join public.worker_profiles worker on worker.account_id=dispatch.worker_id
  left join lateral(select avg(review.stars)::numeric(3,2) rating,count(*) review_count from public.reviews review
    where review.worker_account_id=dispatch.worker_id and review.moderation_status='PUBLISHED') stats on true
  where dispatch.service_request_id=req.id and dispatch.status<>'EXPIRED';
  return result;
end $$;

create or replace function public.get_my_dispatch_offers()
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('dispatchId',d.id,'serviceRequestId',d.service_request_id,'status',d.status,'distanceMeters',d.distance_meters,'expiresAt',d.expires_at,
    'category',c.name,'description',r.description,'budget',r.budget,'area',coalesce(a.city,a.barangay,'Nearby customer')) order by d.offered_at desc),'[]'::jsonb)
  from public.service_request_dispatches d join public.service_requests r on r.id=d.service_request_id join public.addresses a on a.id=r.address_id join public.service_categories c on c.id=r.category_id
  where d.worker_id=auth.uid() and d.expires_at>now() and d.status in ('OFFERED','VIEWED','ACCEPTED')
$$;

create or replace function public.get_my_worker_live_status()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare worker public.worker_profiles; presence public.worker_presence; subdivision_name text;
begin
  select * into worker from public.worker_profiles where account_id=auth.uid();
  if worker.account_id is null then raise exception using errcode='42501',message='WORKER_ROLE_REQUIRED'; end if;
  select * into presence from public.worker_presence where worker_id=auth.uid();
  select name into subdivision_name from public.subdivisions where id=worker.subdivision_id;
  return jsonb_build_object('subdivisionId',worker.subdivision_id,'subdivisionName',subdivision_name,'serviceArea',worker.service_area,
    'radiusMeters',worker.service_radius_meters,'presenceOnline',coalesce(presence.online,false),'lastSeenAt',presence.last_seen_at,
    'latitude',case when presence.location is null then null else round(extensions.st_y(presence.location::extensions.geometry)::numeric,6) end,
    'longitude',case when presence.location is null then null else round(extensions.st_x(presence.location::extensions.geometry)::numeric,6) end,
    'accuracyMeters',presence.accuracy_meters);
end $$;

create or replace function public.respond_to_dispatch(p_dispatch_id uuid,p_response text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.service_request_dispatches;
begin
  if p_response not in ('ACCEPTED','DECLINED') then raise exception using errcode='22023',message='INVALID_DISPATCH_RESPONSE'; end if;
  update public.service_request_dispatches set status=p_response,responded_at=now(),updated_at=now()
  where id=p_dispatch_id and worker_id=auth.uid() and status in ('OFFERED','VIEWED') and expires_at>now() returning * into d;
  if d.id is null then raise exception using errcode='P0001',message='DISPATCH_OFFER_UNAVAILABLE'; end if;
  return jsonb_build_object('dispatchId',d.id,'status',d.status);
end $$;

create or replace function public.select_worker(p_service_request_id uuid,p_worker_id uuid)
returns public.bookings language plpgsql security definer set search_path='' as $$
declare req public.service_requests; result public.bookings; conversation_id uuid;
begin
  select * into req from public.service_requests where id=p_service_request_id for update;
  if req.user_account_id is distinct from auth.uid() or req.status not in ('OPEN','MATCHED') then
    raise exception using errcode='42501',message='Service request cannot be selected';
  end if;
  if not exists(select 1 from public.service_request_dispatches d where d.service_request_id=req.id and d.worker_id=p_worker_id and d.status='ACCEPTED' and d.expires_at>now()) then
    raise exception using errcode='P0001',message='WORKER_HAS_NOT_ACCEPTED';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='bookings' and column_name='agreed_service_amount') then
    execute 'insert into public.bookings(service_request_id,user_account_id,worker_account_id,agreed_service_amount) values($1,$2,$3,$4) returning *'
      into result using req.id,auth.uid(),p_worker_id,req.budget;
  else
    insert into public.bookings(service_request_id,user_account_id,worker_account_id)
    values(req.id,auth.uid(),p_worker_id) returning * into result;
  end if;
  insert into public.booking_status_events(booking_id,to_status,actor_id) values(result.id,'PENDING',auth.uid());
  insert into public.conversations(booking_id) values(result.id) returning id into conversation_id;
  insert into public.conversation_participants(conversation_id,account_id) values(conversation_id,auth.uid()),(conversation_id,p_worker_id);
  update public.service_requests set status='BOOKED',selected_worker_id=p_worker_id where id=req.id;
  update public.service_request_dispatches set status=case when worker_id=p_worker_id then 'SELECTED' else 'EXPIRED' end,updated_at=now() where service_request_id=req.id;
  update public.worker_presence set online=false,updated_at=now() where worker_id=p_worker_id;
  perform pgmq.send('booking_timeouts',jsonb_build_object('booking_id',result.id,'due_at',result.response_due_at,'attempt',0));
  return result;
end $$;

create or replace function public.get_my_worker_matching_readiness()
returns jsonb
language plpgsql
stable
security definer
set search_path='' as $$
declare
  worker public.worker_profiles;
  account public.accounts;
  schedule_count integer;
  schedule jsonb;
begin
  select * into account from public.accounts where id=auth.uid();
  if account.id is null or account.role<>'WORKER' or account.deleted_at is not null then
    raise exception using errcode='42501',message='WORKER_ROLE_REQUIRED';
  end if;
  select * into worker from public.worker_profiles where account_id=auth.uid();
  if worker.account_id is null then
    raise exception using errcode='P0002',message='WORKER_PROFILE_NOT_FOUND';
  end if;

  select count(*),coalesce(jsonb_agg(jsonb_build_object(
    'dayOfWeek',availability.day_of_week,
    'startTime',to_char(availability.start_time,'HH24:MI'),
    'endTime',to_char(availability.end_time,'HH24:MI'),
    'timezone',availability.timezone
  ) order by availability.day_of_week),'[]'::jsonb)
  into schedule_count,schedule
  from public.worker_availability availability
  where availability.worker_id=worker.account_id;

  return jsonb_build_object(
    'accountEligible',account.status='ACTIVE',
    'verificationStatus',worker.approval_status,
    'skillsReady',true,
    'serviceAreaReady',worker.service_origin is not null and worker.service_radius_meters is not null,
    'scheduleReady',schedule_count>0,
    'online',worker.is_available,
    'setupComplete',
      account.status='ACTIVE'
      and worker.approval_status='APPROVED'
      and worker.service_origin is not null
      and worker.service_radius_meters is not null
      and schedule_count>0,
    'matchable',
      account.status='ACTIVE'
      and worker.approval_status='APPROVED'
      and worker.service_origin is not null
      and worker.service_radius_meters is not null
      and schedule_count>0
      and worker.is_available,
    'latitude',case when worker.service_origin is null then null else round(extensions.st_y(worker.service_origin::extensions.geometry)::numeric,6) end,
    'longitude',case when worker.service_origin is null then null else round(extensions.st_x(worker.service_origin::extensions.geometry)::numeric,6) end,
    'serviceRadiusMeters',worker.service_radius_meters,
    'serviceArea',worker.service_area,
    'schedule',schedule
  );
end
$$;

grant execute on function public.get_my_worker_matching_readiness() to authenticated;

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

revoke all on function public.save_my_worker_matching_setup(numeric, numeric, integer, text, jsonb, boolean) from public, anon;
grant execute on function public.save_my_worker_matching_setup(numeric, numeric, integer, text, jsonb, boolean) to authenticated;

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

revoke all on function public.get_match_diagnostics(uuid) from public, anon;
grant execute on function public.get_match_diagnostics(uuid) to authenticated;

revoke all on function public.get_my_worker_live_status() from public,anon;
grant execute on function public.get_my_worker_live_status() to authenticated;

-- ---------------------------------------------------------
-- 5. REALTIME PUBLICATION
-- ---------------------------------------------------------

do $$ begin
  alter publication supabase_realtime add table public.service_request_dispatches;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.reviews;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------
-- 6. SCHEMA RELOAD
-- ---------------------------------------------------------

select pg_notify('pgrst','reload schema');

commit;

