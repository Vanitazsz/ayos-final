begin;

create or replace function public.admin_activate_verified_worker(p_worker_id uuid)
returns public.worker_profiles
language plpgsql security definer set search_path = public, extensions as $$
declare result public.worker_profiles; plumbing_id uuid;
begin
  if not public.is_admin(true) then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  if not exists (select 1 from public.accounts where id=p_worker_id and role='WORKER' and status <> 'SUSPENDED' and deleted_at is null) then
    raise exception using errcode='P0002', message='Worker account not found';
  end if;
  update public.accounts set status='ACTIVE', updated_at=now() where id=p_worker_id;
  select id into plumbing_id from public.service_categories where lower(name)='plumbing' and is_active limit 1;
  if plumbing_id is not null then
    insert into public.worker_skills(worker_id,category_id) values(p_worker_id,plumbing_id) on conflict do nothing;
  end if;
  insert into public.worker_availability(worker_id,day_of_week,start_time,end_time,timezone)
  select p_worker_id, d, '00:00'::time, '23:59'::time, 'Asia/Manila' from generate_series(0,6) d
  where not exists (select 1 from public.worker_availability a where a.worker_id=p_worker_id and a.day_of_week=d);
  update public.worker_profiles set approval_status='APPROVED', approved_at=coalesce(approved_at,now()), is_available=true,
    service_radius_meters=coalesce(service_radius_meters,50000), updated_at=now()
  where account_id=p_worker_id returning * into result;
  return result;
end $$;

revoke all on function public.admin_activate_verified_worker(uuid) from public, anon, authenticated;
grant execute on function public.admin_activate_verified_worker(uuid) to authenticated;

create or replace function public.review_worker_verification(verification_id uuid, decision public.worker_approval_status, notes text default null)
returns public.worker_verifications language plpgsql security definer set search_path = public, extensions as $$
declare verification public.worker_verifications; result public.worker_verifications;
begin
  if not public.is_admin(true) or decision not in ('APPROVED','NEEDS_DOCUMENTS','REJECTED') then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  select * into verification from public.worker_verifications where id=verification_id for update;
  update public.worker_verifications set status=decision,requested_notes=notes,reviewed_by=auth.uid(),reviewed_at=now() where id=verification.id returning * into result;
  if decision='APPROVED' then perform public.admin_activate_verified_worker(verification.worker_id); else
    update public.worker_profiles set approval_status=decision, approved_at=null, is_available=false where account_id=verification.worker_id;
  end if;
  update public.accounts set status=case when decision='APPROVED' then 'ACTIVE' else status end, updated_at=now() where id=verification.worker_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'WORKER_VERIFICATION_REVIEWED','worker_verification',verification.id::text,jsonb_build_object('decision',decision));
  return result;
end $$;

do $$ declare w record; begin
  for w in select wp.account_id from public.worker_profiles wp join public.accounts a on a.id=wp.account_id
    where a.role='WORKER' and a.status <> 'SUSPENDED' and a.deleted_at is null and wp.approval_status='APPROVED'
  loop
    begin
      -- Backfill is executed by the migration owner; the routine itself remains admin-gated.
      update public.accounts set status='ACTIVE', updated_at=now() where id=w.account_id;
      update public.worker_profiles set is_available=true, service_radius_meters=coalesce(service_radius_meters,50000), updated_at=now() where account_id=w.account_id;
      insert into public.worker_availability(worker_id,day_of_week,start_time,end_time,timezone)
      select w.account_id,d,'00:00'::time,'23:59'::time,'Asia/Manila' from generate_series(0,6) d
      where not exists(select 1 from public.worker_availability a where a.worker_id=w.account_id and a.day_of_week=d);
      insert into public.worker_skills(worker_id,category_id)
      select w.account_id,c.id from public.service_categories c where lower(c.name)='plumbing' and c.is_active
      on conflict do nothing;
    exception when others then null;
    end;
  end loop;
end $$;

notify pgrst, 'reload schema';
commit;
