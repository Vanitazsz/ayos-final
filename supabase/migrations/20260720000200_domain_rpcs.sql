-- Atomic domain commands. Direct table grants intentionally exclude these writes.
create or replace function public.create_service_request(
  category_id uuid, address_id uuid, description text, scheduled_at timestamptz,
  budget numeric, notes text default null, ai_analysis_id uuid default null,
  notify_on_match boolean default false
) returns public.service_requests language plpgsql security definer set search_path = '' as $$
declare result public.service_requests;
begin
  if public.current_role() <> 'USER' then raise exception using errcode='42501', message='USER role required'; end if;
  if not exists(select 1 from public.content_pages where key='TERMS' and published_at is not null) then raise exception using errcode='P0001', message='CONTENT_NOT_CONFIGURED'; end if;
  if not exists(select 1 from public.addresses where id = address_id and account_id = auth.uid()) then raise exception using errcode='42501', message='Address is unavailable'; end if;
  if scheduled_at <= now() or budget <= 0 or length(trim(description)) not between 10 and 4000 then raise exception using errcode='22023', message='Invalid service request'; end if;
  insert into public.service_requests(user_account_id, category_id, address_id, description, scheduled_at, budget, notes, ai_analysis_id, notify_on_match, status)
  values(auth.uid(), category_id, address_id, trim(description), scheduled_at, round(budget,2), nullif(trim(notes),''), ai_analysis_id, notify_on_match, 'OPEN') returning * into result;
  return result;
end $$;

create or replace function public.select_worker(p_service_request_id uuid, p_worker_id uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare request public.service_requests; result public.bookings; conversation_id uuid;
begin
  select * into request from public.service_requests where id = p_service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') then raise exception using errcode='42501', message='Service request cannot be selected'; end if;
  if not exists(select 1 from public.worker_profiles wp join public.worker_skills ws on ws.worker_id=wp.account_id where wp.account_id=p_worker_id and wp.approval_status='APPROVED' and wp.is_available and ws.category_id=request.category_id) then raise exception using errcode='P0001', message='WORKER_UNAVAILABLE'; end if;
  insert into public.bookings(service_request_id,user_account_id,worker_account_id) values(request.id,auth.uid(),p_worker_id) returning * into result;
  insert into public.booking_status_events(booking_id,to_status,actor_id) values(result.id,'PENDING',auth.uid());
  insert into public.conversations(booking_id) values(result.id) returning id into conversation_id;
  insert into public.conversation_participants(conversation_id,account_id) values(conversation_id,auth.uid()),(conversation_id,p_worker_id);
  update public.service_requests set status='BOOKED', selected_worker_id=p_worker_id where id=request.id;
  perform pgmq.send('booking_timeouts', jsonb_build_object('booking_id',result.id,'due_at',result.response_due_at,'attempt',0));
  return result;
end $$;

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
    where ws.category_id=request.category_id and wp.approval_status='APPROVED' and wp.is_available
      and exists(select 1 from public.worker_availability wa where wa.worker_id=wp.account_id and wa.day_of_week=extract(dow from request.scheduled_at)::integer and request.scheduled_at::time between wa.start_time and wa.end_time)
    group by wp.account_id,ws.years,wp.recommendation_priority
  ) ranked where ranked.rank <= 5;
  get diagnostics matched_count=row_count;
  if matched_count>0 then update public.service_requests set status='MATCHED' where id=request.id;
  else perform pgmq.send('no_match_notifications',jsonb_build_object('service_request_id',request.id,'user_account_id',request.user_account_id),300); end if;
  return query select * from public.match_candidates where public.match_candidates.service_request_id=request.id order by rank;
end $$;

create or replace function public.start_worker_conversation(p_service_request_id uuid, p_worker_id uuid)
returns public.conversations language plpgsql security definer set search_path='' as $$
declare result public.conversations;
begin
  if not exists(select 1 from public.service_requests r where r.id=p_service_request_id and r.user_account_id=auth.uid() and r.status in ('OPEN','MATCHED'))
    or not exists(select 1 from public.match_candidates m where m.service_request_id=p_service_request_id and m.worker_id=p_worker_id and m.eligible) then
    raise exception using errcode='42501',message='Conversation is unavailable'; end if;
  insert into public.conversations(service_request_id,worker_account_id) values(p_service_request_id,p_worker_id)
  on conflict(service_request_id,worker_account_id) where booking_id is null do update set updated_at=now() returning * into result;
  insert into public.conversation_participants(conversation_id,account_id) values(result.id,auth.uid()),(result.id,p_worker_id) on conflict do nothing;
  return result;
end $$;

create or replace function public.transition_booking(p_booking_id uuid, p_target_status public.booking_status, p_expected_version integer, p_reason text default null)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare booking public.bookings; allowed boolean := false; result public.bookings;
begin
  select * into booking from public.bookings b where b.id=p_booking_id for update;
  if booking.id is null or not public.is_booking_party(p_booking_id) then raise exception using errcode='42501', message='Booking unavailable'; end if;
  if booking.version <> p_expected_version then raise exception using errcode='40001', message='BOOKING_VERSION_CONFLICT'; end if;
  allowed := case booking.status
    when 'PENDING' then p_target_status in ('ACCEPTED','CANCELLED')
    when 'ACCEPTED' then p_target_status in ('WORKER_PREPARING','CANCELLED')
    when 'WORKER_PREPARING' then p_target_status in ('WORKER_EN_ROUTE','CANCELLED')
    when 'WORKER_EN_ROUTE' then p_target_status in ('WORKER_ARRIVED','CANCELLED')
    when 'WORKER_ARRIVED' then p_target_status in ('SERVICE_STARTED','CANCELLED')
    when 'SERVICE_STARTED' then p_target_status in ('IN_PROGRESS','CANCELLED')
    when 'IN_PROGRESS' then p_target_status in ('COMPLETED','CANCELLED') else false end;
  if not allowed then raise exception using errcode='P0001', message='INVALID_BOOKING_TRANSITION'; end if;
  if p_target_status not in ('CANCELLED') and auth.uid() <> booking.worker_account_id and not public.is_admin(true) then raise exception using errcode='42501', message='Worker or administrator required'; end if;
  if p_target_status='CANCELLED' and (p_reason is null or length(trim(p_reason)) < 3) then raise exception using errcode='22023', message='Cancellation reason required'; end if;
  if p_target_status='ACCEPTED' and auth.uid() <> booking.worker_account_id then raise exception using errcode='42501', message='Assigned worker required'; end if;
  update public.bookings set status=p_target_status, version=version+1,
    accepted_at=case when p_target_status='ACCEPTED' then now() else accepted_at end,
    completed_at=case when p_target_status='COMPLETED' then now() else completed_at end,
    cancelled_at=case when p_target_status='CANCELLED' then now() else cancelled_at end
  where id=booking.id returning * into result;
  insert into public.booking_status_events(booking_id,from_status,to_status,actor_id,reason) values(booking.id,booking.status,p_target_status,auth.uid(),nullif(trim(p_reason),''));
  if p_target_status='CANCELLED' then
    insert into public.cancellations(booking_id,cancelled_by,reason,policy_version)
    values(booking.id,auth.uid(),trim(p_reason),(select version from public.content_pages where key='REFUND_POLICY' and published_at is not null))
    on conflict on constraint cancellations_booking_id_key do nothing;
    update public.service_requests set status='OPEN',selected_worker_id=null where id=booking.service_request_id;
  elsif p_target_status='COMPLETED' then update public.service_requests set status='CLOSED' where id=booking.service_request_id; end if;
  return result;
end $$;

create or replace function public.record_worker_location(booking_id uuid, latitude numeric, longitude numeric)
returns public.location_updates language plpgsql security definer set search_path = '' as $$
declare booking public.bookings; result public.location_updates;
begin
  select * into booking from public.bookings where id=booking_id;
  if booking.worker_account_id is distinct from auth.uid() or booking.status not in ('WORKER_EN_ROUTE','WORKER_ARRIVED','SERVICE_STARTED','IN_PROGRESS') then raise exception using errcode='42501', message='Location update not allowed'; end if;
  if latitude not between -90 and 90 or longitude not between -180 and 180 then raise exception using errcode='22023', message='Invalid coordinates'; end if;
  insert into public.location_updates(booking_id,account_id,latitude,longitude) values(booking.id,auth.uid(),latitude,longitude) returning * into result;
  return result;
end $$;

create or replace function public.confirm_cash_payment(p_booking_id uuid, p_idempotency_key text)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare booking public.bookings; payment public.payments; confirmation_party public.cash_confirmation_party; amount numeric(12,2); rate numeric(5,4); commission numeric(12,2);
begin
  select * into booking from public.bookings where id=p_booking_id for update;
  if booking.status <> 'COMPLETED' or auth.uid() not in (booking.user_account_id,booking.worker_account_id) then raise exception using errcode='42501', message='Cash confirmation not allowed'; end if;
  if length(p_idempotency_key) not between 16 and 128 then raise exception using errcode='22023', message='Invalid idempotency key'; end if;
  amount := (select budget from public.service_requests where id=booking.service_request_id); rate := 0.1000; commission := round(amount*rate,2);
  insert into public.payments(booking_id,method,status,service_amount,commission_rate,commission_amount,worker_net_amount,idempotency_key)
  values(booking.id,'CASH','AWAITING_CONFIRMATIONS',amount,rate,commission,amount-commission,p_idempotency_key)
  on conflict(booking_id) do update set updated_at=now() returning * into payment;
  confirmation_party := case when auth.uid()=booking.user_account_id then 'USER'::public.cash_confirmation_party else 'WORKER'::public.cash_confirmation_party end;
  insert into public.cash_confirmations(payment_id,account_id,party) values(payment.id,auth.uid(),confirmation_party) on conflict(payment_id,party) do nothing;
  if (select count(*) from public.cash_confirmations where payment_id=payment.id)=2 then
    update public.payments set status='SUCCESSFUL',successful_at=coalesce(successful_at,now()) where id=payment.id returning * into payment;
    insert into public.receipts(payment_id,receipt_number,service_amount,commission_rate,commission_amount,worker_net_amount,homeowner_platform_charge)
    values(payment.id,'AYOS-'||upper(substr(replace(payment.id::text,'-',''),1,12)),payment.service_amount,payment.commission_rate,payment.commission_amount,payment.worker_net_amount,payment.homeowner_platform_charge) on conflict(payment_id) do nothing;
  end if;
  return payment;
end $$;

create or replace function public.create_review(p_booking_id uuid, stars integer, body text, recommend_worker boolean)
returns public.reviews language plpgsql security definer set search_path = '' as $$
declare booking public.bookings; result public.reviews;
begin
  select * into booking from public.bookings where id=p_booking_id;
  if booking.user_account_id is distinct from auth.uid() or booking.status <> 'COMPLETED' or not exists(select 1 from public.payments where booking_id=booking.id and status='SUCCESSFUL') then raise exception using errcode='42501', message='REVIEW_NOT_ALLOWED'; end if;
  if stars not between 1 and 5 or length(trim(body)) not between 3 and 4000 then raise exception using errcode='22023', message='Invalid review'; end if;
  insert into public.reviews(booking_id,user_account_id,worker_account_id,stars,body,recommend_worker)
  values(booking.id,booking.user_account_id,booking.worker_account_id,stars,trim(body),recommend_worker) returning * into result;
  return result;
end $$;

create or replace function public.review_worker_verification(verification_id uuid, decision public.worker_approval_status, notes text default null)
returns public.worker_verifications language plpgsql security definer set search_path = '' as $$
declare verification public.worker_verifications; result public.worker_verifications;
begin
  if not public.is_admin(true) or decision not in ('APPROVED','NEEDS_DOCUMENTS','REJECTED') then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  select * into verification from public.worker_verifications where id=verification_id for update;
  update public.worker_verifications set status=decision,requested_notes=notes,reviewed_by=auth.uid(),reviewed_at=now() where id=verification.id returning * into result;
  update public.worker_profiles set approval_status=decision,approved_at=case when decision='APPROVED' then now() else null end,is_available=case when decision='APPROVED' then is_available else false end where account_id=verification.worker_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'WORKER_VERIFICATION_REVIEWED','worker_verification',verification.id::text,jsonb_build_object('decision',decision));
  return result;
end $$;

create or replace function public.set_account_status(account_id uuid, next_status public.account_status)
returns public.accounts language plpgsql security definer set search_path = '' as $$
declare result public.accounts;
begin
  if not public.is_admin(true) then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  update public.accounts set status=next_status where id=account_id returning * into result;
  if result.id is null then raise exception using errcode='P0002', message='Account not found'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'ACCOUNT_STATUS_CHANGED','account',account_id::text,jsonb_build_object('status',next_status));
  return result;
end $$;

create or replace function public.set_recommendation_priority(worker_id uuid, enabled boolean)
returns public.worker_profiles language plpgsql security definer set search_path = '' as $$
declare result public.worker_profiles;
begin
  if not public.is_admin(true) then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  update public.worker_profiles set recommendation_priority=enabled where account_id=worker_id returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'RECOMMENDATION_PRIORITY_CHANGED','worker',worker_id::text,jsonb_build_object('enabled',enabled));
  return result;
end $$;

create or replace function public.decide_refund(p_refund_id uuid, p_decision public.refund_status, p_reason text)
returns public.refunds language plpgsql security definer set search_path = '' as $$
declare result public.refunds;
begin
  if not public.is_admin(true) or p_decision not in ('PROCESSED','REJECTED') then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  update public.refunds r set status=p_decision,reason=trim(p_reason),decided_by=auth.uid(),decided_at=now() where r.id=p_refund_id and r.status='PENDING' returning * into result;
  if result.id is null then raise exception using errcode='P0001', message='REFUND_DECISION_NOT_ALLOWED'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'REFUND_DECIDED','refund',p_refund_id::text,jsonb_build_object('decision',p_decision));
  return result;
end $$;

create or replace function public.move_to_trash(entity_type text, entity_id text, snapshot jsonb)
returns public.trash_entries language plpgsql security definer set search_path = '' as $$
declare result public.trash_entries;
begin
  if not public.is_admin(true) then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  insert into public.trash_entries(entity_type,entity_id,snapshot,deleted_by) values(entity_type,entity_id,snapshot,auth.uid()) returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'MOVED_TO_TRASH',entity_type,entity_id);
  return result;
end $$;
create or replace function public.restore_from_trash(trash_id uuid) returns public.trash_entries language plpgsql security definer set search_path = '' as $$
declare result public.trash_entries;
begin
  if not public.is_admin(true) then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  update public.trash_entries set restored_at=now(),restored_by=auth.uid() where id=trash_id and restored_at is null returning * into result;
  if result.id is null then raise exception using errcode='P0001', message='RESTORE_NOT_ALLOWED'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'RESTORED_FROM_TRASH',result.entity_type,result.entity_id);
  return result;
end $$;
create or replace function public.permanently_delete(trash_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.is_admin(true) then insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'PERMANENT_DELETION_BLOCKED','trash_entry',trash_id::text,'{}'); end if;
  raise exception using errcode='42501', message='PERMANENT_DELETION_BLOCKED';
end $$;

revoke all on function public.create_service_request(uuid,uuid,text,timestamptz,numeric,text,uuid,boolean) from public;
grant execute on function public.create_service_request(uuid,uuid,text,timestamptz,numeric,text,uuid,boolean) to authenticated;
grant execute on all functions in schema public to authenticated;
