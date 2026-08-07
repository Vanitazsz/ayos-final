begin;

-- Make the two-party cash confirmation order-independent.
--
-- The worker's "Confirm Payment" button now calls confirm_cash_payment (in
-- addition to the wallet commission RPC), so a WORKER confirmation row is
-- recorded and the payment completes (SUCCESSFUL + receipt) once the other
-- party has already confirmed. If the payment was settled out of order --
-- e.g. the worker confirmed first or deduct_booking_commission finalized the
-- payment early -- a later call must still record the caller's confirmation
-- and ensure the receipt exists instead of early-returning.

create or replace function public.confirm_cash_payment(p_booking_id uuid, p_idempotency_key text)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare
  booking public.bookings; payment public.payments;
  confirmation_party public.cash_confirmation_party;
  amount numeric(12,2); rate_percent numeric(5,2); rate numeric(5,4);
  homeowner_charge numeric(12,2); commission numeric(12,2);
begin
  select * into booking from public.bookings where id = p_booking_id for update;
  if booking.status <> 'COMPLETED' or auth.uid() not in (booking.user_account_id, booking.worker_account_id) then
    raise exception using errcode = '42501', message = 'Cash confirmation not allowed';
  end if;
  if length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'Invalid idempotency key';
  end if;
  select * into payment from public.payments where booking_id = booking.id for update;
  confirmation_party := case when auth.uid() = booking.user_account_id then 'USER'::public.cash_confirmation_party else 'WORKER'::public.cash_confirmation_party end;
  if payment.status = 'SUCCESSFUL' then
    if payment.method = 'CASH' then
      insert into public.cash_confirmations(payment_id, account_id, party)
      values(payment.id, auth.uid(), confirmation_party) on conflict(payment_id, party) do nothing;
      insert into public.receipts(payment_id, receipt_number, service_amount, commission_rate, commission_amount, worker_net_amount, homeowner_platform_charge)
      values(payment.id, 'AYOS-' || upper(substr(replace(payment.id::text, '-', ''), 1, 12)), payment.service_amount, payment.commission_rate, payment.commission_amount, payment.worker_net_amount, payment.homeowner_platform_charge)
      on conflict(payment_id) do nothing;
    end if;
    return payment;
  end if;
  if payment.id is not null and payment.method = 'GCASH' and payment.status in ('PENDING', 'AWAITING_CONFIRMATIONS') then
    raise exception using errcode = '55000', message = 'GCash payment is already in progress';
  end if;
  amount := booking.agreed_service_amount;
  select coalesce((value #>> '{}')::numeric, 10) into rate_percent
  from public.system_settings where key = 'platform_settings.commission_rate';
  select coalesce((value #>> '{}')::numeric, 0) into homeowner_charge
  from public.system_settings where key = 'platform_settings.homeowner_charge';
  rate_percent := coalesce(rate_percent, 10);
  homeowner_charge := coalesce(homeowner_charge, 0);
  if rate_percent < 0 or rate_percent > 50 or homeowner_charge < 0 then
    raise exception using errcode = '22023', message = 'Invalid platform fee settings';
  end if;
  rate := rate_percent / 100;
  commission := round(amount * rate, 2);
  if payment.id is null then
    insert into public.payments(booking_id, method, status, service_amount, commission_rate, commission_amount, worker_net_amount, homeowner_platform_charge, idempotency_key)
    values(booking.id, 'CASH', 'AWAITING_CONFIRMATIONS', amount, rate, commission, amount - commission, homeowner_charge, p_idempotency_key)
    returning * into payment;
  else
    update public.payments set method = 'CASH', status = 'AWAITING_CONFIRMATIONS', provider = null,
      provider_payment_id = null, failure_reason = null, service_amount = amount,
      commission_rate = rate, commission_amount = commission, worker_net_amount = amount - commission,
      homeowner_platform_charge = homeowner_charge
    where id = payment.id returning * into payment;
  end if;
  insert into public.cash_confirmations(payment_id, account_id, party)
  values(payment.id, auth.uid(), confirmation_party) on conflict(payment_id, party) do nothing;
  if (select count(*) from public.cash_confirmations where payment_id = payment.id) = 2 then
    update public.payments set status = 'SUCCESSFUL', successful_at = coalesce(successful_at, now()), paid_at = coalesce(paid_at, now()) where id = payment.id returning * into payment;
    insert into public.receipts(payment_id, receipt_number, service_amount, commission_rate, commission_amount, worker_net_amount, homeowner_platform_charge)
    values(payment.id, 'AYOS-' || upper(substr(replace(payment.id::text, '-', ''), 1, 12)), payment.service_amount, payment.commission_rate, payment.commission_amount, payment.worker_net_amount, payment.homeowner_platform_charge)
    on conflict(payment_id) do nothing;
  end if;
  return payment;
end $$;

notify pgrst, 'reload schema';

commit;
