-- PostGIS-backed discovery/tracking and AI provider auditability.
-- FR-10–FR-13, FR-33–FR-44, FR-77, FR-92–FR-98; NFR-04–NFR-18.
create extension if not exists postgis with schema extensions;

alter table public.worker_profiles
  drop column latitude,
  drop column longitude,
  add column service_origin extensions.geography(point, 4326),
  add column service_radius_meters integer check (service_radius_meters between 100 and 200000),
  add column latitude numeric(9,6) generated always as
    (round(extensions.st_y(service_origin::extensions.geometry)::numeric, 6)) stored,
  add column longitude numeric(9,6) generated always as
    (round(extensions.st_x(service_origin::extensions.geometry)::numeric, 6)) stored;

alter table public.addresses
  drop column latitude,
  drop column longitude,
  add column location extensions.geography(point, 4326),
  add column latitude numeric(9,6) generated always as
    (round(extensions.st_y(location::extensions.geometry)::numeric, 6)) stored,
  add column longitude numeric(9,6) generated always as
    (round(extensions.st_x(location::extensions.geometry)::numeric, 6)) stored;

alter table public.service_requests
  add column service_location extensions.geography(point, 4326) not null;

alter table public.location_updates
  drop column latitude,
  drop column longitude,
  add column location extensions.geography(point, 4326) not null,
  add column latitude numeric(9,6) generated always as
    (round(extensions.st_y(location::extensions.geometry)::numeric, 6)) stored,
  add column longitude numeric(9,6) generated always as
    (round(extensions.st_x(location::extensions.geometry)::numeric, 6)) stored;

create index worker_profiles_service_origin_gix on public.worker_profiles using gist(service_origin);
create index addresses_location_gix on public.addresses using gist(location);
create index service_requests_location_gix on public.service_requests using gist(service_location);
create index location_updates_location_gix on public.location_updates using gist(location);

alter table public.ai_analyses
  add column provider_model text,
  add column idempotency_key text,
  add column request_draft text,
  add constraint ai_analyses_idempotency_key_check
    check (idempotency_key is null or length(idempotency_key) between 16 and 128),
  add constraint ai_analyses_cost_range_check
    check (
      estimated_cost_minimum is null
      or estimated_cost_maximum is null
      or estimated_cost_minimum <= estimated_cost_maximum
    );
create unique index ai_analyses_account_idempotency_idx
  on public.ai_analyses(account_id, idempotency_key) where idempotency_key is not null;

create table public.ai_analysis_attempts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  analysis_id uuid references public.ai_analyses(id) on delete set null,
  idempotency_key text not null check (length(idempotency_key) between 16 and 128),
  provider text not null check (provider in ('OPENAI','GEMINI','OPENROUTER')),
  model text not null,
  outcome text not null check (outcome in ('SUCCEEDED','FAILED','SKIPPED')),
  retryable boolean not null,
  latency_ms integer not null check (latency_ms >= 0),
  error_code text,
  created_at timestamptz not null default now()
);
create index ai_analysis_attempts_account_time_idx
  on public.ai_analysis_attempts(account_id, created_at desc);
create unique index ai_analysis_attempts_idempotent_idx
  on public.ai_analysis_attempts(account_id, idempotency_key, provider, model, outcome);
alter table public.ai_analysis_attempts enable row level security;
revoke all on public.ai_analysis_attempts from anon, authenticated;
grant select on public.ai_analysis_attempts to authenticated;
create policy ai_attempts_owner_or_admin_read on public.ai_analysis_attempts
  for select to authenticated
  using (account_id = auth.uid() or public.is_admin(false));

create or replace function public.persist_ai_analysis(
  p_account_id uuid, p_input_type text, p_input_storage_path text, p_transcript text,
  p_idempotency_key text, p_provider text, p_model text, p_provider_reference text,
  p_result jsonb, p_attempts jsonb
) returns public.ai_analyses
language plpgsql security definer set search_path = '' as $$
declare result public.ai_analyses;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode='42501', message='SERVICE_ROLE_REQUIRED';
  end if;
  if p_input_type not in ('TEXT','IMAGE','VOICE')
    or p_provider not in ('OPENAI','GEMINI','OPENROUTER')
    or length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode='22023', message='INVALID_AI_ANALYSIS';
  end if;
  insert into public.ai_analyses(
    account_id,input_type,input_storage_path,transcript,detected_issue,severity,
    possible_cause,suggested_category_name,estimated_cost_minimum,
    estimated_cost_maximum,safety_advice,request_draft,provider,provider_model,
    provider_reference,idempotency_key
  ) values (
    p_account_id,p_input_type,p_input_storage_path,p_transcript,
    p_result->>'detectedIssue',p_result->>'severity',p_result->>'possibleCause',
    p_result->>'suggestedCategory',(p_result->>'estimatedCostMinimum')::numeric,
    (p_result->>'estimatedCostMaximum')::numeric,p_result->>'safetyAdvice',
    p_result->>'requestDraft',p_provider,p_model,p_provider_reference,p_idempotency_key
  )
  on conflict(account_id,idempotency_key) where idempotency_key is not null
    do update set id=public.ai_analyses.id
  returning * into result;

  insert into public.ai_analysis_attempts(
    account_id,analysis_id,idempotency_key,provider,model,outcome,retryable,
    latency_ms,error_code
  )
  select p_account_id,result.id,p_idempotency_key,attempt.provider,attempt.model,
    attempt.outcome,attempt.retryable,attempt.latency_ms,attempt.error_code
  from jsonb_to_recordset(p_attempts) as attempt(
    provider text, model text, outcome text, retryable boolean,
    latency_ms integer, error_code text
  )
  on conflict(account_id,idempotency_key,provider,model,outcome) do nothing;
  return result;
end $$;

revoke execute on function public.persist_ai_analysis(uuid,text,text,text,text,text,text,text,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.persist_ai_analysis(uuid,text,text,text,text,text,text,text,jsonb,jsonb)
  to service_role;

create or replace function private.make_location(p_latitude numeric, p_longitude numeric)
returns extensions.geography
language plpgsql immutable set search_path = '' as $$
begin
  if p_latitude is null or p_longitude is null
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180 then
    raise exception using errcode='22023', message='INVALID_COORDINATES';
  end if;
  return extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography;
end $$;

create or replace function public.set_address_location(
  p_address_id uuid,
  p_latitude numeric,
  p_longitude numeric
) returns public.addresses
language plpgsql security definer set search_path = '' as $$
declare result public.addresses;
begin
  update public.addresses
  set location = private.make_location(p_latitude, p_longitude)
  where id = p_address_id and account_id = auth.uid()
  returning * into result;
  if result.id is null then
    raise exception using errcode='42501', message='ADDRESS_UNAVAILABLE';
  end if;
  return result;
end $$;

create or replace function public.set_worker_service_area(
  p_latitude numeric,
  p_longitude numeric,
  p_radius_meters integer
) returns public.worker_profiles
language plpgsql security definer set search_path = '' as $$
declare result public.worker_profiles;
begin
  if public.current_role() <> 'WORKER' then
    raise exception using errcode='42501', message='WORKER_ROLE_REQUIRED';
  end if;
  if p_radius_meters not between 100 and 200000 then
    raise exception using errcode='22023', message='INVALID_SERVICE_RADIUS';
  end if;
  update public.worker_profiles
  set service_origin = private.make_location(p_latitude, p_longitude),
      service_radius_meters = p_radius_meters
  where account_id = auth.uid()
  returning * into result;
  return result;
end $$;

create or replace function public.create_service_request(
  category_id uuid, address_id uuid, description text, scheduled_at timestamptz,
  budget numeric, notes text default null, ai_analysis_id uuid default null,
  notify_on_match boolean default false
) returns public.service_requests
language plpgsql security definer set search_path = '' as $$
declare result public.service_requests; address_location extensions.geography;
begin
  if public.current_role() <> 'USER' then raise exception using errcode='42501', message='USER role required'; end if;
  if not exists(select 1 from public.content_pages where key='TERMS' and published_at is not null) then
    raise exception using errcode='P0001', message='CONTENT_NOT_CONFIGURED';
  end if;
  select location into address_location from public.addresses
    where id = address_id and account_id = auth.uid();
  if address_location is null then raise exception using errcode='22023', message='ADDRESS_LOCATION_REQUIRED'; end if;
  if ai_analysis_id is not null and not exists(
    select 1 from public.ai_analyses where id=ai_analysis_id and account_id=auth.uid()
  ) then raise exception using errcode='42501', message='AI_ANALYSIS_UNAVAILABLE'; end if;
  if scheduled_at <= now() or budget <= 0 or length(trim(description)) not between 10 and 4000 then
    raise exception using errcode='22023', message='Invalid service request';
  end if;
  insert into public.service_requests(
    user_account_id, category_id, address_id, service_location, description,
    scheduled_at, budget, notes, ai_analysis_id, notify_on_match, status
  ) values(
    auth.uid(), category_id, address_id, address_location, trim(description),
    scheduled_at, round(budget,2), nullif(trim(notes),''), ai_analysis_id, notify_on_match, 'OPEN'
  ) returning * into result;
  return result;
end $$;

create or replace function public.generate_matches(p_service_request_id uuid)
returns setof public.match_candidates
language plpgsql security definer set search_path = '' as $$
declare request public.service_requests; matched_count integer;
begin
  select * into request from public.service_requests where id=p_service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') then
    raise exception using errcode='42501',message='Service request unavailable';
  end if;
  delete from public.match_candidates where service_request_id=request.id;
  insert into public.match_candidates(service_request_id,worker_id,score,rank,factors,eligible)
  with eligible as (
    select wp.account_id worker_id, ws.years,
      coalesce(avg(r.stars) filter(where r.moderation_status='PUBLISHED'),0)::numeric(3,2) rating,
      wp.recommendation_priority,
      extensions.st_distance(wp.service_origin, request.service_location)::numeric(12,2) distance_meters,
      (ws.years*5 + coalesce(avg(r.stars) filter(where r.moderation_status='PUBLISHED'),0)*10)::numeric(7,4) suitability_score
    from public.worker_profiles wp
    join public.worker_skills ws on ws.worker_id=wp.account_id
    left join public.reviews r on r.worker_account_id=wp.account_id
    where ws.category_id=request.category_id
      and wp.approval_status='APPROVED' and wp.is_available
      and wp.service_origin is not null and wp.service_radius_meters is not null
      and extensions.st_dwithin(wp.service_origin, request.service_location, wp.service_radius_meters)
      and exists(
        select 1 from public.worker_availability wa
        where wa.worker_id=wp.account_id
          and wa.day_of_week=extract(dow from request.scheduled_at)::integer
          and request.scheduled_at::time between wa.start_time and wa.end_time
      )
    group by wp.account_id,ws.years,wp.recommendation_priority,wp.service_origin,wp.service_radius_meters
  ), ranked as (
    select *, row_number() over(
      order by suitability_score desc, distance_meters asc, recommendation_priority desc, worker_id
    )::integer as candidate_rank
    from eligible
  )
  select request.id, worker_id, suitability_score, candidate_rank,
    jsonb_build_object(
      'category',true,'available',true,'years',years,'rating',rating,
      'distance_meters',distance_meters,'recommendation_priority',recommendation_priority
    ), true
  from ranked where candidate_rank <= 5;
  get diagnostics matched_count=row_count;
  if matched_count>0 then update public.service_requests set status='MATCHED' where id=request.id;
  else perform pgmq.send('no_match_notifications',jsonb_build_object('service_request_id',request.id,'user_account_id',request.user_account_id),300); end if;
  return query select * from public.match_candidates
    where service_request_id=request.id order by rank;
end $$;

create or replace function public.select_worker(p_service_request_id uuid, p_worker_id uuid)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare request public.service_requests; result public.bookings; conversation_id uuid;
begin
  select * into request from public.service_requests where id = p_service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') then
    raise exception using errcode='42501', message='Service request cannot be selected';
  end if;
  if not exists(
    select 1 from public.worker_profiles wp
    join public.worker_skills ws on ws.worker_id=wp.account_id
    where wp.account_id=p_worker_id and wp.approval_status='APPROVED' and wp.is_available
      and ws.category_id=request.category_id
      and wp.service_origin is not null and wp.service_radius_meters is not null
      and extensions.st_dwithin(wp.service_origin, request.service_location, wp.service_radius_meters)
  ) then raise exception using errcode='P0001', message='WORKER_UNAVAILABLE'; end if;
  insert into public.bookings(service_request_id,user_account_id,worker_account_id)
    values(request.id,auth.uid(),p_worker_id) returning * into result;
  insert into public.booking_status_events(booking_id,to_status,actor_id)
    values(result.id,'PENDING',auth.uid());
  insert into public.conversations(booking_id) values(result.id) returning id into conversation_id;
  insert into public.conversation_participants(conversation_id,account_id)
    values(conversation_id,auth.uid()),(conversation_id,p_worker_id);
  update public.service_requests set status='BOOKED', selected_worker_id=p_worker_id where id=request.id;
  perform pgmq.send('booking_timeouts', jsonb_build_object('booking_id',result.id,'due_at',result.response_due_at,'attempt',0));
  return result;
end $$;

create or replace function public.record_worker_location(
  booking_id uuid,
  latitude numeric,
  longitude numeric
) returns public.location_updates
language plpgsql security definer set search_path = '' as $$
declare booking public.bookings; result public.location_updates;
begin
  select * into booking from public.bookings where id=booking_id;
  if booking.worker_account_id is distinct from auth.uid()
    or booking.status not in ('WORKER_EN_ROUTE','WORKER_ARRIVED','SERVICE_STARTED','IN_PROGRESS') then
    raise exception using errcode='42501', message='Location update not allowed';
  end if;
  insert into public.location_updates(booking_id,account_id,location)
    values(booking.id,auth.uid(),private.make_location(latitude,longitude)) returning * into result;
  return result;
end $$;

create or replace function public.get_booking_tracking(p_booking_id uuid, p_limit integer default 100)
returns table(latitude numeric, longitude numeric, recorded_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_booking_party(p_booking_id) then
    raise exception using errcode='42501', message='BOOKING_LOCATION_UNAVAILABLE';
  end if;
  return query
    select updates.latitude, updates.longitude, updates.recorded_at
    from public.location_updates updates
    where updates.booking_id=p_booking_id
    order by updates.recorded_at desc
    limit least(greatest(p_limit,1),250);
end $$;

revoke execute on function private.make_location(numeric,numeric) from public, anon, authenticated;
revoke execute on function public.set_address_location(uuid,numeric,numeric),
  public.set_worker_service_area(numeric,numeric,integer),
  public.get_booking_tracking(uuid,integer) from public, anon;
grant execute on function public.set_address_location(uuid,numeric,numeric),
  public.set_worker_service_area(numeric,numeric,integer),
  public.get_booking_tracking(uuid,integer) to authenticated;
