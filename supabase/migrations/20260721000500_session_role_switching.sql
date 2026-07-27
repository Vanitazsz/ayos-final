-- Session-scoped User/Worker role switching without mutating the account's original role.

create table public.account_role_memberships (
  account_id uuid not null references public.accounts(id) on delete cascade,
  role public.account_role not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key(account_id, role),
  check (role <> 'ADMIN' or status = 'ACTIVE')
);

create table public.account_session_roles (
  session_id text primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  active_role public.account_role not null,
  switched_at timestamptz not null default now(),
  check (active_role <> 'ADMIN')
);
create index account_session_roles_account_idx on public.account_session_roles(account_id, switched_at desc);

alter table public.account_role_memberships enable row level security;
alter table public.account_session_roles enable row level security;
revoke all on public.account_role_memberships, public.account_session_roles from anon, authenticated;
grant select on public.account_role_memberships to authenticated;

create policy role_memberships_owner_or_admin_read on public.account_role_memberships for select to authenticated
using (account_id = auth.uid() or public.is_admin(true));

insert into public.account_role_memberships(account_id, role)
select id, role from public.accounts on conflict(account_id, role) do nothing;

create or replace function public.provision_primary_role_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.account_role_memberships(account_id, role) values(new.id, new.role)
  on conflict(account_id, role) do nothing;
  return new;
end $$;
create trigger provision_primary_role_membership after insert on public.accounts
for each row execute function public.provision_primary_role_membership();

create or replace function public.current_role()
returns public.account_role language sql stable security definer set search_path = '' as $$
  select coalesce(
    (
      select sr.active_role from public.account_session_roles sr
      join public.account_role_memberships m on m.account_id = sr.account_id and m.role = sr.active_role and m.status = 'ACTIVE'
      where sr.account_id = auth.uid() and sr.session_id = coalesce(auth.jwt()->>'session_id', auth.uid()::text || ':legacy')
    ),
    (
      select a.role from public.accounts a where a.id = auth.uid() and a.status = 'ACTIVE' and a.deleted_at is null
    )
  )
$$;

create or replace function public.enable_secondary_role(p_role public.account_role)
returns public.account_role language plpgsql security definer set search_path = '' as $$
declare primary_role public.account_role; v_display_name text;
begin
  select role into primary_role from public.accounts where id = auth.uid() and status = 'ACTIVE' and deleted_at is null for update;
  if primary_role is null or primary_role = 'ADMIN' or p_role = 'ADMIN' then
    raise exception using errcode = '42501', message = 'Role switching is unavailable';
  end if;
  if p_role = 'USER' then
    select w.display_name into v_display_name from public.worker_profiles w where w.account_id = auth.uid();
    insert into public.user_profiles(account_id, display_name) values(auth.uid(), coalesce(v_display_name, 'A-YOS User'))
    on conflict(account_id) do nothing;
  elsif p_role = 'WORKER' then
    select u.display_name into v_display_name from public.user_profiles u where u.account_id = auth.uid();
    insert into public.worker_profiles(account_id, display_name) values(auth.uid(), coalesce(v_display_name, 'A-YOS Worker'))
    on conflict(account_id) do nothing;
  end if;
  insert into public.account_role_memberships(account_id, role, status) values(auth.uid(), p_role, 'ACTIVE')
  on conflict(account_id, role) do update set status = 'ACTIVE', revoked_at = null;
  return p_role;
end $$;

create or replace function public.switch_active_role(p_role public.account_role)
returns public.account_role language plpgsql security definer set search_path = '' as $$
declare session_identifier text;
begin
  if p_role = 'ADMIN' or not exists (
    select 1 from public.account_role_memberships m where m.account_id = auth.uid() and m.role = p_role and m.status = 'ACTIVE'
  ) then raise exception using errcode = '42501', message = 'Role is unavailable'; end if;
  session_identifier := coalesce(auth.jwt()->>'session_id', auth.uid()::text || ':legacy');
  insert into public.account_session_roles(session_id, account_id, active_role)
  values(session_identifier, auth.uid(), p_role)
  on conflict(session_id) do update set active_role = excluded.active_role, switched_at = now()
  where public.account_session_roles.account_id = auth.uid();
  return p_role;
end $$;

create or replace function public.get_my_role_context()
returns table(primary_role public.account_role, active_role public.account_role, available_roles public.account_role[])
language sql stable security definer set search_path = '' as $$
  select a.role, public.current_role(), array_agg(m.role order by m.role)::public.account_role[]
  from public.accounts a join public.account_role_memberships m on m.account_id = a.id and m.status = 'ACTIVE'
  where a.id = auth.uid() group by a.role
$$;

create or replace function public.generate_matches(p_service_request_id uuid)
returns setof public.match_candidates language plpgsql security definer set search_path='' as $$
declare request public.service_requests; matched_count integer;
begin
  select * into request from public.service_requests where id=p_service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') then raise exception using errcode='42501',message='Service request unavailable'; end if;
  delete from public.match_candidates where service_request_id=request.id;
  insert into public.match_candidates(service_request_id,worker_id,score,rank,factors,eligible)
  select request.id, ranked.worker_id, ranked.score, ranked.rank,
    jsonb_build_object('category',true,'available',true,'years',ranked.years,'rating',ranked.rating,'recommendation_priority',ranked.recommendation_priority),true
  from (
    select wp.account_id worker_id, ws.years, coalesce(avg(r.stars) filter(where r.moderation_status='PUBLISHED'),0)::numeric(3,2) rating,
      wp.recommendation_priority,
      (ws.years*5 + coalesce(avg(r.stars) filter(where r.moderation_status='PUBLISHED'),0)*10 + case when wp.recommendation_priority then 0.01 else 0 end)::numeric(7,4) score,
      row_number() over(order by ws.years*5 + coalesce(avg(r.stars) filter(where r.moderation_status='PUBLISHED'),0)*10 desc,wp.recommendation_priority desc,wp.account_id)::integer rank
    from public.worker_profiles wp join public.worker_skills ws on ws.worker_id=wp.account_id
    left join public.reviews r on r.worker_account_id=wp.account_id
    where wp.account_id <> request.user_account_id and ws.category_id=request.category_id and wp.approval_status='APPROVED' and wp.is_available
      and exists(select 1 from public.worker_availability wa where wa.worker_id=wp.account_id and wa.day_of_week=extract(dow from request.scheduled_at)::integer and request.scheduled_at::time between wa.start_time and wa.end_time)
    group by wp.account_id,ws.years,wp.recommendation_priority
  ) ranked where ranked.rank <= 5;
  get diagnostics matched_count=row_count;
  if matched_count>0 then update public.service_requests set status='MATCHED' where id=request.id;
  else perform pgmq.send('no_match_notifications',jsonb_build_object('service_request_id',request.id,'user_account_id',request.user_account_id),300); end if;
  return query select * from public.match_candidates where public.match_candidates.service_request_id=request.id order by rank;
end $$;

revoke all on function public.enable_secondary_role(public.account_role) from public, anon;
revoke all on function public.switch_active_role(public.account_role) from public, anon;
revoke all on function public.get_my_role_context() from public, anon;
grant execute on function public.enable_secondary_role(public.account_role) to authenticated;
grant execute on function public.switch_active_role(public.account_role) to authenticated;
grant execute on function public.get_my_role_context() to authenticated;
