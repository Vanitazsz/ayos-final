-- Subdivision-scoped discovery and matching.

create table if not exists public.subdivisions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 160),
  center_lat double precision not null check (center_lat between -90 and 90),
  center_lng double precision not null check (center_lng between -180 and 180),
  radius_meters integer not null default 2000 check (radius_meters between 100 and 50000),
  boundary jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists subdivisions_name_key on public.subdivisions(lower(name));
create index if not exists subdivisions_active_idx on public.subdivisions(is_active, name);
alter table public.user_profiles
  add column if not exists subdivision_id uuid references public.subdivisions(id) on delete set null;
alter table public.worker_profiles
  add column if not exists subdivision_id uuid references public.subdivisions(id) on delete set null;
alter table public.service_requests
  add column if not exists subdivision_id uuid references public.subdivisions(id) on delete set null;
create index if not exists user_profiles_subdivision_idx on public.user_profiles(subdivision_id);
create index if not exists worker_profiles_subdivision_idx on public.worker_profiles(subdivision_id, approval_status, is_available);
create index if not exists service_requests_subdivision_idx on public.service_requests(subdivision_id, status);
alter table public.subdivisions enable row level security;
revoke all on public.subdivisions from anon, authenticated;
grant select on public.subdivisions to authenticated;
grant select, insert, update, delete on public.subdivisions to service_role;
drop policy if exists subdivisions_authenticated_read on public.subdivisions;
create policy subdivisions_authenticated_read on public.subdivisions
for select to authenticated using (is_active or public.is_admin(false));
drop policy if exists subdivisions_admin_insert on public.subdivisions;
create policy subdivisions_admin_insert on public.subdivisions
for insert to authenticated with check (public.is_admin(true));
drop policy if exists subdivisions_admin_update on public.subdivisions;
create policy subdivisions_admin_update on public.subdivisions
for update to authenticated using (public.is_admin(true)) with check (public.is_admin(true));
drop policy if exists subdivisions_admin_delete on public.subdivisions;
create policy subdivisions_admin_delete on public.subdivisions
for delete to authenticated using (public.is_admin(true));
create or replace function public.auto_detect_subdivision(
  p_lat double precision,
  p_lng double precision
) returns setof public.subdivisions
language sql stable security definer set search_path = '' as $$
  select subdivision.*
  from public.subdivisions subdivision
  where subdivision.is_active
    and extensions.st_dwithin(
      extensions.st_setsrid(extensions.st_makepoint(subdivision.center_lng, subdivision.center_lat), 4326)::extensions.geography,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
      subdivision.radius_meters
    )
  order by extensions.st_distance(
    extensions.st_setsrid(extensions.st_makepoint(subdivision.center_lng, subdivision.center_lat), 4326)::extensions.geography,
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
  ), subdivision.name
  limit 1
$$;
create or replace function public.set_my_subdivision(p_subdivision_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare selected_id uuid; account_role public.account_role;
begin
  select subdivision.id into selected_id
  from public.subdivisions subdivision
  where subdivision.id = p_subdivision_id and subdivision.is_active;
  if selected_id is null then
    raise exception using errcode = '22023', message = 'SUBDIVISION_UNAVAILABLE';
  end if;
  select account.role into account_role from public.accounts account
  where account.id = auth.uid() and account.status = 'ACTIVE' and account.deleted_at is null;
  if account_role = 'USER' then
    update public.user_profiles set subdivision_id = selected_id, updated_at = now()
    where account_id = auth.uid();
  elsif account_role = 'WORKER' then
    update public.worker_profiles set subdivision_id = selected_id, updated_at = now()
    where account_id = auth.uid();
  else
    raise exception using errcode = '42501', message = 'CUSTOMER_OR_WORKER_REQUIRED';
  end if;
  if not found then raise exception using errcode = 'P0002', message = 'PROFILE_NOT_FOUND'; end if;
  return selected_id;
end $$;
create or replace function public.admin_create_subdivision(
  p_name text,
  p_lat double precision,
  p_lng double precision,
  p_radius_meters integer,
  p_boundary jsonb default null
) returns public.subdivisions
language plpgsql security definer set search_path = '' as $$
declare result public.subdivisions;
begin
  if not public.is_admin(true) then raise exception using errcode = '42501', message = 'ADMIN_REQUIRED'; end if;
  insert into public.subdivisions(name, center_lat, center_lng, radius_meters, boundary)
  values(btrim(p_name), p_lat, p_lng, p_radius_meters, p_boundary)
  returning * into result;
  return result;
end $$;
create or replace function public.admin_update_subdivision(
  p_id uuid,
  p_name text,
  p_lat double precision,
  p_lng double precision,
  p_radius_meters integer,
  p_boundary jsonb default null,
  p_is_active boolean default true
) returns public.subdivisions
language plpgsql security definer set search_path = '' as $$
declare result public.subdivisions;
begin
  if not public.is_admin(true) then raise exception using errcode = '42501', message = 'ADMIN_REQUIRED'; end if;
  update public.subdivisions
  set name = btrim(p_name), center_lat = p_lat, center_lng = p_lng,
      radius_meters = p_radius_meters, boundary = p_boundary,
      is_active = p_is_active, updated_at = now()
  where id = p_id returning * into result;
  if result.id is null then raise exception using errcode = 'P0002', message = 'SUBDIVISION_NOT_FOUND'; end if;
  return result;
end $$;
create or replace function public.admin_list_subdivisions()
returns setof public.subdivisions
language sql stable security definer set search_path = '' as $$
  select subdivision.* from public.subdivisions subdivision
  where public.is_admin(true)
  order by subdivision.name
$$;
insert into public.system_settings(key, value)
values(
  'matching.weights',
  '{"distance":0.30,"availability":0.20,"rating":0.20,"completed_jobs":0.10,"response_history":0.10,"cancellation_history":0.05,"priority":0.05}'::jsonb
)
on conflict(key) do nothing;
create or replace function public.generate_matches(p_service_request_id uuid)
returns setof public.match_candidates
language plpgsql security definer set search_path = '' as $$
declare
  request public.service_requests;
  customer_subdivision uuid;
  weights jsonb;
  matched_count integer;
begin
  select * into request from public.service_requests where id = p_service_request_id for update;
  if request.id is null or request.user_account_id is distinct from auth.uid()
    or request.status not in ('OPEN', 'MATCHED') then
    raise exception using errcode = '42501', message = 'Service request unavailable';
  end if;
  select profile.subdivision_id into customer_subdivision
  from public.user_profiles profile where profile.account_id = request.user_account_id;
  customer_subdivision := coalesce(request.subdivision_id, customer_subdivision);
  select setting.value into weights from public.system_settings setting where setting.key = 'matching.weights';
  weights := coalesce(weights, '{"distance":0.30,"availability":0.20,"rating":0.20,"completed_jobs":0.10,"response_history":0.10,"cancellation_history":0.05,"priority":0.05}'::jsonb);

  delete from public.match_candidates where service_request_id = request.id;
  insert into public.match_candidates(service_request_id, worker_id, score, rank, factors, eligible)
  with worker_metrics as (
    select
      worker.account_id as worker_id,
      skill.years,
      worker.recommendation_priority,
      extensions.st_distance(worker.service_origin, request.service_location) / 1000.0 as distance_km,
      coalesce(avg(review.stars) filter (where review.moderation_status = 'PUBLISHED'), 0) as rating,
      count(distinct booking.id) filter (where booking.status = 'COMPLETED') as completed_jobs,
      count(distinct booking.id) filter (where booking.status = 'CANCELLED')::numeric
        / nullif(count(distinct booking.id), 0) as cancellation_rate,
      avg(extract(epoch from (booking.accepted_at - booking.created_at)) / 60.0)
        filter (where booking.accepted_at is not null) as response_minutes
    from public.worker_profiles worker
    join public.worker_skills skill on skill.worker_id = worker.account_id
    left join public.reviews review on review.worker_account_id = worker.account_id
    left join public.bookings booking on booking.worker_account_id = worker.account_id
    where skill.category_id = request.category_id
      and worker.account_id <> request.user_account_id
      and worker.approval_status = 'APPROVED'
      and worker.is_available
      and worker.service_origin is not null
      and worker.service_radius_meters is not null
      and (
        (customer_subdivision is not null and worker.subdivision_id = customer_subdivision)
        or (
          customer_subdivision is null
          and extensions.st_dwithin(worker.service_origin, request.service_location, worker.service_radius_meters)
        )
      )
      and exists (
        select 1 from public.worker_availability availability
        where availability.worker_id = worker.account_id
          and availability.day_of_week = extract(dow from request.scheduled_at)::integer
          and request.scheduled_at::time between availability.start_time and availability.end_time
      )
    group by worker.account_id, skill.years, worker.recommendation_priority,
      worker.service_origin, worker.service_radius_meters
  ), scored as (
    select metrics.*,
      greatest(0, 100 - metrics.distance_km * 5) as distance_score,
      100::numeric as availability_score,
      least(100, metrics.rating / 5 * 100) as rating_score,
      least(100, metrics.completed_jobs * 5)::numeric as completed_jobs_score,
      greatest(0, 100 - coalesce(metrics.response_minutes, 20) * 5) as response_score,
      greatest(0, 100 - coalesce(metrics.cancellation_rate, 0) * 200) as cancellation_score,
      case when metrics.recommendation_priority then 100 else 0 end::numeric as priority_score
    from worker_metrics metrics
  ), ranked as (
    select scored.*,
      (
        distance_score * coalesce((weights->>'distance')::numeric, 0.30)
        + availability_score * coalesce((weights->>'availability')::numeric, 0.20)
        + rating_score * coalesce((weights->>'rating')::numeric, 0.20)
        + completed_jobs_score * coalesce((weights->>'completedJobs')::numeric, (weights->>'completed_jobs')::numeric, 0.10)
        + response_score * coalesce((weights->>'responseHistory')::numeric, (weights->>'response_history')::numeric, 0.10)
        + cancellation_score * coalesce((weights->>'cancellationHistory')::numeric, (weights->>'cancellation_history')::numeric, 0.05)
        + priority_score * coalesce((weights->>'recommendationPriority')::numeric, (weights->>'priority')::numeric, 0.05)
      )::numeric(7,4) as weighted_score,
      row_number() over(order by
        distance_score * coalesce((weights->>'distance')::numeric, 0.30)
        + availability_score * coalesce((weights->>'availability')::numeric, 0.20)
        + rating_score * coalesce((weights->>'rating')::numeric, 0.20)
        + completed_jobs_score * coalesce((weights->>'completedJobs')::numeric, (weights->>'completed_jobs')::numeric, 0.10)
        + response_score * coalesce((weights->>'responseHistory')::numeric, (weights->>'response_history')::numeric, 0.10)
        + cancellation_score * coalesce((weights->>'cancellationHistory')::numeric, (weights->>'cancellation_history')::numeric, 0.05)
        + priority_score * coalesce((weights->>'recommendationPriority')::numeric, (weights->>'priority')::numeric, 0.05) desc,
        distance_km asc, worker_id
      )::integer as candidate_rank
    from scored
  )
  select request.id, worker_id, weighted_score, candidate_rank,
    jsonb_build_object(
      'distance_km', round(distance_km::numeric, 2),
      'distance', round(distance_score::numeric, 2),
      'availability', availability_score,
      'rating', round(rating_score::numeric, 2),
      'completed_jobs', completed_jobs_score,
      'response_history', round(response_score::numeric, 2),
      'cancellation_history', round(cancellation_score::numeric, 2),
      'recommendation_priority', priority_score,
      'subdivision_id', customer_subdivision
    ), true
  from ranked where candidate_rank <= 5;

  get diagnostics matched_count = row_count;
  update public.service_requests
  set subdivision_id = customer_subdivision,
      status = case when matched_count > 0 then 'MATCHED' else status end,
      updated_at = now()
  where id = request.id;
  if matched_count = 0 then
    perform pgmq.send('no_match_notifications', jsonb_build_object(
      'service_request_id', request.id,
      'user_account_id', request.user_account_id
    ), 300);
  end if;
  return query select candidate.* from public.match_candidates candidate
  where candidate.service_request_id = request.id order by candidate.rank;
end $$;
revoke all on function public.auto_detect_subdivision(double precision, double precision) from public, anon;
revoke all on function public.set_my_subdivision(uuid) from public, anon;
revoke all on function public.admin_create_subdivision(text, double precision, double precision, integer, jsonb) from public, anon;
revoke all on function public.admin_update_subdivision(uuid, text, double precision, double precision, integer, jsonb, boolean) from public, anon;
revoke all on function public.admin_list_subdivisions() from public, anon;
grant execute on function public.auto_detect_subdivision(double precision, double precision) to authenticated;
grant execute on function public.set_my_subdivision(uuid) to authenticated;
grant execute on function public.admin_create_subdivision(text, double precision, double precision, integer, jsonb) to authenticated;
grant execute on function public.admin_update_subdivision(uuid, text, double precision, double precision, integer, jsonb, boolean) to authenticated;
grant execute on function public.admin_list_subdivisions() to authenticated;
