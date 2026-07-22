-- Cross-method and out-of-order provider event invariants.

create or replace function public.preserve_successful_payment()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'SUCCESSFUL' and new.status <> 'SUCCESSFUL' then return old; end if;
  return new;
end $$;
create trigger preserve_successful_payment before update of status on public.payments
for each row execute function public.preserve_successful_payment();

create or replace function public.preserve_successful_payment_attempt()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'SUCCESSFUL' and new.status <> 'SUCCESSFUL' then return old; end if;
  return new;
end $$;
create trigger preserve_successful_payment_attempt before update of status on public.payment_attempts
for each row execute function public.preserve_successful_payment_attempt();

create or replace function public.confirm_cash_payment(p_booking_id uuid, p_idempotency_key text)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare booking public.bookings; payment public.payments; confirmation_party public.cash_confirmation_party; amount numeric(12,2); rate numeric(5,4); commission numeric(12,2);
begin
  select * into booking from public.bookings where id=p_booking_id for update;
  if booking.status <> 'COMPLETED' or auth.uid() not in (booking.user_account_id,booking.worker_account_id) then raise exception using errcode='42501', message='Cash confirmation not allowed'; end if;
  if length(p_idempotency_key) not between 16 and 128 then raise exception using errcode='22023', message='Invalid idempotency key'; end if;
  select * into payment from public.payments where booking_id = booking.id for update;
  if payment.status = 'SUCCESSFUL' then return payment; end if;
  if payment.id is not null and payment.method = 'GCASH' and payment.status in ('PENDING','AWAITING_CONFIRMATIONS') then
    raise exception using errcode='55000', message='GCash payment is already in progress';
  end if;
  amount := booking.agreed_service_amount;
  rate := 0.1000;
  commission := round(amount*rate,2);
  if payment.id is null then
    insert into public.payments(booking_id,method,status,service_amount,commission_rate,commission_amount,worker_net_amount,idempotency_key)
    values(booking.id,'CASH','AWAITING_CONFIRMATIONS',amount,rate,commission,amount-commission,p_idempotency_key)
    returning * into payment;
  else
    update public.payments set method = 'CASH', status = 'AWAITING_CONFIRMATIONS', provider = null,
      provider_payment_id = null, failure_reason = null, service_amount = amount,
      commission_rate = rate, commission_amount = commission, worker_net_amount = amount - commission
    where id = payment.id returning * into payment;
  end if;
  confirmation_party := case when auth.uid()=booking.user_account_id then 'USER'::public.cash_confirmation_party else 'WORKER'::public.cash_confirmation_party end;
  insert into public.cash_confirmations(payment_id,account_id,party) values(payment.id,auth.uid(),confirmation_party) on conflict(payment_id,party) do nothing;
  if (select count(*) from public.cash_confirmations where payment_id=payment.id)=2 then
    update public.payments set status='SUCCESSFUL',successful_at=coalesce(successful_at,now()),paid_at=coalesce(paid_at,now()) where id=payment.id returning * into payment;
    insert into public.receipts(payment_id,receipt_number,service_amount,commission_rate,commission_amount,worker_net_amount,homeowner_platform_charge)
    values(payment.id,'AYOS-'||upper(substr(replace(payment.id::text,'-',''),1,12)),payment.service_amount,payment.commission_rate,payment.commission_amount,payment.worker_net_amount,payment.homeowner_platform_charge) on conflict(payment_id) do nothing;
  end if;
  return payment;
end $$;
