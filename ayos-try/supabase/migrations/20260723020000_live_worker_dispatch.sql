begin;
create table public.worker_presence (
  worker_id uuid primary key references public.worker_profiles(account_id) on delete cascade,
  location extensions.geography(point, 4326) not null,
  accuracy_meters numeric(8,2),
  online boolean not null default true,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (accuracy_meters is null or accuracy_meters between 0 and 10000)
);
create index worker_presence_live_idx on public.worker_presence(online, last_seen_at desc);
create index worker_presence_location_gix on public.worker_presence using gist(location);
create table public.live_dispatch_sessions (
  service_request_id uuid primary key references public.service_requests(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '2 minutes')
);
create table public.service_request_dispatches (
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
create index dispatch_request_status_idx on public.service_request_dispatches(service_request_id,status,distance_meters);
create index dispatch_worker_status_idx on public.service_request_dispatches(worker_id,status,expires_at);
alter table public.worker_presence enable row level security;
alter table public.live_dispatch_sessions enable row level security;
alter table public.service_request_dispatches enable row level security;
revoke all on public.worker_presence, public.live_dispatch_sessions, public.service_request_dispatches from anon, authenticated;
grant select on public.worker_presence, public.live_dispatch_sessions, public.service_request_dispatches to authenticated;
create policy worker_presence_owner_read on public.worker_presence for select to authenticated
using(worker_id=auth.uid() or public.is_admin(false));
create policy live_dispatch_session_owner_read on public.live_dispatch_sessions for select to authenticated
using(exists(select 1 from public.service_requests r where r.id=service_request_id and r.user_account_id=auth.uid()) or public.is_admin(false));
create policy dispatch_participant_read on public.service_request_dispatches for select to authenticated
using(worker_id=auth.uid() or exists(select 1 from public.service_requests r where r.id=service_request_id and r.user_account_id=auth.uid()) or public.is_admin(false));
create or replace function private.refresh_live_dispatch(p_service_request_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare req public.service_requests; started timestamptz; elapsed_seconds numeric; current_wave smallint; search_radius numeric;
begin
  select * into req from public.service_requests where id=p_service_request_id;
  if req.id is null or req.status not in ('OPEN','MATCHED') then return; end if;
  select started_at into started from public.live_dispatch_sessions where service_request_id=req.id;
  if started is null then return; end if;
  elapsed_seconds := extract(epoch from(now()-started));
  if elapsed_seconds >= 120 then
    update public.service_request_dispatches set status='EXPIRED',updated_at=now()
    where service_request_id=req.id and status in ('OFFERED','VIEWED');
    return;
  end if;
  current_wave := case when elapsed_seconds >= 60 then 3 when elapsed_seconds >= 30 then 2 else 1 end;
  search_radius := case current_wave when 1 then 5000 when 2 then 10000 else 200000 end;
  insert into public.service_request_dispatches(service_request_id,worker_id,wave,distance_meters,approximate_latitude,approximate_longitude,expires_at)
  select req.id,wp.account_id,current_wave,round(extensions.st_distance(p.location,req.service_location)::numeric,2),
    round((extensions.st_y(p.location::extensions.geometry)+(mod(abs(hashtext(req.id::text||wp.account_id::text)),17)-8)*0.00008)::numeric,6),
    round((extensions.st_x(p.location::extensions.geometry)+(mod(abs(hashtext(wp.account_id::text||req.id::text)),17)-8)*0.00008)::numeric,6),
    started+interval '2 minutes'
  from public.worker_profiles wp
  join public.accounts a on a.id=wp.account_id
  join public.worker_presence p on p.worker_id=wp.account_id
  where a.role='WORKER' and a.status='ACTIVE' and a.deleted_at is null
    and wp.approval_status='APPROVED' and wp.is_available and p.online and p.last_seen_at>now()-interval '30 seconds'
    and exists(select 1 from public.worker_skills s where s.worker_id=wp.account_id and s.category_id=req.category_id)
    and exists(select 1 from public.worker_availability av where av.worker_id=wp.account_id
      and av.day_of_week=extract(dow from req.scheduled_at at time zone 'Asia/Manila')::integer
      and (req.scheduled_at at time zone 'Asia/Manila')::time between av.start_time and av.end_time)
    and (req.subdivision_id is null or wp.subdivision_id=req.subdivision_id)
    and extensions.st_dwithin(p.location,req.service_location,least(search_radius,coalesce(wp.service_radius_meters,search_radius)))
  on conflict(service_request_id,worker_id) do update set
    wave=greatest(service_request_dispatches.wave,excluded.wave),distance_meters=excluded.distance_meters,
    approximate_latitude=excluded.approximate_latitude,approximate_longitude=excluded.approximate_longitude,updated_at=now()
  where service_request_dispatches.status in ('OFFERED','VIEWED');
end $$;
create or replace function public.update_worker_presence(p_latitude numeric,p_longitude numeric,p_accuracy_meters numeric default null,p_online boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.worker_profiles wp join public.accounts a on a.id=wp.account_id where wp.account_id=auth.uid() and a.status='ACTIVE' and wp.approval_status='APPROVED') then
    raise exception using errcode='42501',message='WORKER_NOT_READY';
  end if;
  insert into public.worker_presence(worker_id,location,accuracy_meters,online,last_seen_at)
  values(auth.uid(),private.make_location(p_latitude,p_longitude),p_accuracy_meters,p_online,now())
  on conflict(worker_id) do update set location=excluded.location,accuracy_meters=excluded.accuracy_meters,online=excluded.online,last_seen_at=now(),updated_at=now();
  return jsonb_build_object('online',p_online,'lastSeenAt',now());
end $$;
create or replace function public.start_live_dispatch(p_service_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.service_requests r where r.id=p_service_request_id and r.user_account_id=auth.uid() and r.status in ('OPEN','MATCHED')) then
    raise exception using errcode='42501',message='SERVICE_REQUEST_UNAVAILABLE';
  end if;
  insert into public.live_dispatch_sessions(service_request_id) values(p_service_request_id) on conflict(service_request_id) do nothing;
  perform private.refresh_live_dispatch(p_service_request_id);
  return public.get_live_dispatch_snapshot(p_service_request_id);
end $$;
create or replace function public.get_live_dispatch_snapshot(p_service_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare req public.service_requests; started timestamptz; dispatch_expires timestamptz; result jsonb;
begin
  select * into req from public.service_requests where id=p_service_request_id;
  if req.id is null or req.user_account_id<>auth.uid() then raise exception using errcode='42501',message='SERVICE_REQUEST_UNAVAILABLE'; end if;
  perform private.refresh_live_dispatch(req.id);
  select started_at,expires_at into started,dispatch_expires from public.live_dispatch_sessions where service_request_id=req.id;
  if started is null then raise exception using errcode='P0001',message='LIVE_DISPATCH_NOT_STARTED'; end if;
  select jsonb_build_object('serviceRequestId',req.id,'startedAt',started,'expiresAt',dispatch_expires,
    'wave',case when extract(epoch from(now()-started))>=60 then 3 when extract(epoch from(now()-started))>=30 then 2 else 1 end,
    'candidates',coalesce(jsonb_agg(jsonb_build_object('dispatchId',d.id,'workerId',d.worker_id,'status',d.status,'name',wp.display_name,'avatar',wp.avatar_path,
      'distanceMeters',d.distance_meters,'latitude',d.approximate_latitude,'longitude',d.approximate_longitude,'rating',coalesce(stats.rating,0),'reviewCount',coalesce(stats.review_count,0)) order by (d.status='ACCEPTED') desc,d.distance_meters) filter(where d.id is not null),'[]'::jsonb))
  into result from public.service_request_dispatches d join public.worker_profiles wp on wp.account_id=d.worker_id
  left join lateral(select avg(r.stars)::numeric(3,2) rating,count(*) review_count from public.reviews r where r.worker_account_id=d.worker_id and r.moderation_status='PUBLISHED') stats on true
  where d.service_request_id=req.id and d.status<>'EXPIRED';
  return result;
end $$;
create or replace function public.get_my_dispatch_offers()
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('dispatchId',d.id,'serviceRequestId',d.service_request_id,'status',d.status,'distanceMeters',d.distance_meters,'expiresAt',d.expires_at,
    'category',c.name,'description',r.description,'budget',r.budget,'area',coalesce(a.city,a.barangay,'Nearby customer')) order by d.offered_at desc),'[]'::jsonb)
  from public.service_request_dispatches d join public.service_requests r on r.id=d.service_request_id join public.addresses a on a.id=r.address_id join public.service_categories c on c.id=r.category_id
  where d.worker_id=auth.uid() and d.expires_at>now() and d.status in ('OFFERED','VIEWED','ACCEPTED')
$$;
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
  if req.user_account_id is distinct from auth.uid() or req.status not in ('OPEN','MATCHED') then raise exception using errcode='42501',message='Service request cannot be selected'; end if;
  if not exists(select 1 from public.service_request_dispatches d where d.service_request_id=req.id and d.worker_id=p_worker_id and d.status='ACCEPTED' and d.expires_at>now()) then raise exception using errcode='P0001',message='WORKER_HAS_NOT_ACCEPTED'; end if;
  insert into public.bookings(service_request_id,user_account_id,worker_account_id,agreed_service_amount) values(req.id,auth.uid(),p_worker_id,req.budget) returning * into result;
  insert into public.booking_status_events(booking_id,to_status,actor_id) values(result.id,'PENDING',auth.uid());
  insert into public.conversations(booking_id) values(result.id) returning id into conversation_id;
  insert into public.conversation_participants(conversation_id,account_id) values(conversation_id,auth.uid()),(conversation_id,p_worker_id);
  update public.service_requests set status='BOOKED',selected_worker_id=p_worker_id where id=req.id;
  update public.service_request_dispatches set status=case when worker_id=p_worker_id then 'SELECTED' else 'EXPIRED' end,updated_at=now() where service_request_id=req.id;
  update public.worker_presence set online=false,updated_at=now() where worker_id=p_worker_id;
  perform pgmq.send('booking_timeouts',jsonb_build_object('booking_id',result.id,'due_at',result.response_due_at,'attempt',0)); return result;
end $$;
revoke all on function private.refresh_live_dispatch(uuid) from public,anon,authenticated;
grant execute on function public.update_worker_presence(numeric,numeric,numeric,boolean),public.start_live_dispatch(uuid),public.get_live_dispatch_snapshot(uuid),public.get_my_dispatch_offers(),public.respond_to_dispatch(uuid,text) to authenticated;
do $$ begin
  alter publication supabase_realtime add table public.service_request_dispatches;
exception when duplicate_object then null; end $$;
notify pgrst,'reload schema';
commit;
