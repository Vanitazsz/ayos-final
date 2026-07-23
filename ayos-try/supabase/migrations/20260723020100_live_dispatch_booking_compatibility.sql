begin;
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
notify pgrst,'reload schema';
commit;
