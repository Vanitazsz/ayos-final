-- Persist the customer-submitted proof-of-payment / receipt image on the
-- booking payment so admins can review it.
--
-- The mobile payment screen uploads the receipt to the 'booking-proof'
-- Storage bucket via uploadBookingProof() but previously discarded the
-- returned path. This adds payments.proof_path and teaches the cash + GCash
-- payment RPCs to validate and store it, mirroring the wallet_topups proof
-- gate (path owned by the caller and present in storage).
--
-- The original 2-argument overloads are preserved as thin wrappers so the
-- existing pgtap signature assertions and callers keep working; the optional
-- p_proof_path is threaded through the new 3-argument overloads.

-- 1. Add proof_path column to payments
alter table public.payments
  add column if not exists proof_path text;

alter table public.payments
  drop constraint if exists payments_proof_path_check;
alter table public.payments
  add constraint payments_proof_path_check
  check (proof_path is null or length(proof_path) between 3 and 1024);

-- 2. Rebuild confirm_cash_payment with an optional proof path.
create or replace function public.confirm_cash_payment(
  p_booking_id uuid,
  p_idempotency_key text,
  p_proof_path text default null
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  payment public.payments;
  confirmation_party public.cash_confirmation_party;
  category_id uuid;
  amount numeric(12,2);
  rate_percent numeric(5,2);
  rate numeric(5,4);
  safe_receipt_rate numeric(5,4);
  homeowner_charge numeric(12,2);
  commission numeric(12,2);
begin
  if p_proof_path is not null and (
    length(p_proof_path) not between 3 and 1024
    or not p_proof_path like auth.uid()::text || '/%'
    or not exists (
      select 1 from storage.objects object
      where object.bucket_id = 'booking-proof'
        and object.name = p_proof_path
        and object.owner_id = auth.uid()::text
    )
  ) then
    raise exception using errcode = '22023', message = 'INVALID_PAYMENT_PROOF';
  end if;

  select * into booking from public.bookings where id = p_booking_id for update;
  if booking.status <> 'COMPLETED' or auth.uid() not in (booking.user_account_id, booking.worker_account_id) then
    raise exception using errcode = '42501', message = 'Cash confirmation not allowed';
  end if;
  if length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'Invalid idempotency key';
  end if;
  select * into payment from public.payments where booking_id = booking.id for update;
  confirmation_party := case
    when auth.uid() = booking.user_account_id then 'USER'::public.cash_confirmation_party
    else 'WORKER'::public.cash_confirmation_party
  end;
  if payment.status = 'SUCCESSFUL' then
    if payment.method = 'CASH' then
      insert into public.cash_confirmations(payment_id, account_id, party)
      values(payment.id, auth.uid(), confirmation_party)
      on conflict(payment_id, party) do nothing;

      safe_receipt_rate := case
        when payment.commission_rate > 1 then payment.commission_rate / 100
        else payment.commission_rate
      end;
      if safe_receipt_rate > 0.9999 then safe_receipt_rate := 0.9999; end if;

      insert into public.receipts(
        payment_id, receipt_number, service_amount, commission_rate,
        commission_amount, worker_net_amount, homeowner_platform_charge
      ) values(
        payment.id,
        'AYOS-' || upper(substr(replace(payment.id::text, '-', ''), 1, 12)),
        payment.service_amount,
        safe_receipt_rate,
        payment.commission_amount,
        payment.worker_net_amount,
        payment.homeowner_platform_charge
      ) on conflict(payment_id) do nothing;
    end if;
    return payment;
  end if;
  if payment.id is not null and payment.method = 'GCASH' and payment.status in ('PENDING', 'AWAITING_CONFIRMATIONS') then
    raise exception using errcode = '55000', message = 'GCash payment is already in progress';
  end if;

  select request.category_id
  into category_id
  from public.service_requests request
  where request.id = booking.service_request_id;
  amount := booking.agreed_service_amount;
  rate_percent := public.get_effective_commission_rate(category_id);
  select coalesce((value #>> '{}')::numeric, 0)
  into homeowner_charge
  from public.system_settings
  where key = 'platform_settings.homeowner_charge';
  homeowner_charge := coalesce(homeowner_charge, 0);
  if homeowner_charge < 0 then
    raise exception using errcode = '22023', message = 'Invalid platform fee settings';
  end if;

  rate := case when rate_percent > 1 then rate_percent / 100 else rate_percent end;
  if rate > 0.9999 then rate := 0.9999; elsif rate < 0 then rate := 0.0000; end if;
  commission := round(amount * rate, 2);

  if payment.id is null then
    insert into public.payments(
      booking_id, method, status, service_amount, commission_rate,
      commission_amount, worker_net_amount, homeowner_platform_charge,
      idempotency_key, proof_path
    ) values(
      booking.id, 'CASH', 'AWAITING_CONFIRMATIONS', amount, rate,
      commission, amount - commission, homeowner_charge,
      p_idempotency_key, p_proof_path
    ) returning * into payment;
  else
    update public.payments
    set method = 'CASH',
        status = 'AWAITING_CONFIRMATIONS',
        provider = null,
        provider_payment_id = null,
        failure_reason = null,
        service_amount = amount,
        commission_rate = rate,
        commission_amount = commission,
        worker_net_amount = amount - commission,
        homeowner_platform_charge = homeowner_charge,
        proof_path = coalesce(p_proof_path, payment.proof_path)
    where id = payment.id
    returning * into payment;
  end if;

  insert into public.cash_confirmations(payment_id, account_id, party)
  values(payment.id, auth.uid(), confirmation_party)
  on conflict(payment_id, party) do nothing;
  if (select count(*) from public.cash_confirmations where payment_id = payment.id) = 2 then
    update public.payments
    set status = 'SUCCESSFUL', successful_at = coalesce(successful_at, now()), paid_at = coalesce(paid_at, now())
    where id = payment.id
    returning * into payment;

    safe_receipt_rate := case
      when payment.commission_rate > 1 then payment.commission_rate / 100
      else payment.commission_rate
    end;
    if safe_receipt_rate > 0.9999 then safe_receipt_rate := 0.9999; end if;

    insert into public.receipts(
      payment_id, receipt_number, service_amount, commission_rate,
      commission_amount, worker_net_amount, homeowner_platform_charge
    ) values(
      payment.id,
      'AYOS-' || upper(substr(replace(payment.id::text, '-', ''), 1, 12)),
      payment.service_amount,
      safe_receipt_rate,
      payment.commission_amount,
      payment.worker_net_amount,
      payment.homeowner_platform_charge
    ) on conflict(payment_id) do nothing;
  end if;

  return payment;
end;
$$;

-- Backward-compatible 2-arg wrapper (keeps the pgtap signature assertion green).
create or replace function public.confirm_cash_payment(p_booking_id uuid, p_idempotency_key text)
returns public.payments
language sql
security definer
set search_path = ''
as $$
  select public.confirm_cash_payment(p_booking_id, p_idempotency_key, null);
$$;

revoke all on function public.confirm_cash_payment(uuid, text, text) from public, anon;
grant execute on function public.confirm_cash_payment(uuid, text, text) to authenticated;
revoke all on function public.confirm_cash_payment(uuid, text) from public, anon;
grant execute on function public.confirm_cash_payment(uuid, text) to authenticated;

-- 3. Rebuild simulate_gcash_booking_payment with an optional proof path.
create or replace function public.simulate_gcash_booking_payment(
  p_booking_id uuid,
  p_reference_number text,
  p_proof_path text default null
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  payment public.payments;
  category_id uuid;
  expected_ref text;
  rate_percent numeric(5,2);
  homeowner_charge numeric(12,2);
  rate numeric(5,4);
  comm_amount numeric(12,2);
  worker_net numeric(12,2);
  idempotency_key text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_proof_path is not null and (
    length(p_proof_path) not between 3 and 1024
    or not p_proof_path like auth.uid()::text || '/%'
    or not exists (
      select 1 from storage.objects object
      where object.bucket_id = 'booking-proof'
        and object.name = p_proof_path
        and object.owner_id = auth.uid()::text
    )
  ) then
    raise exception using errcode = '22023', message = 'INVALID_PAYMENT_PROOF';
  end if;

  select * into booking from public.bookings where id = p_booking_id for update;
  if booking.id is null or auth.uid() <> booking.user_account_id then
    raise exception using errcode = '42501', message = 'Only the booking customer can simulate GCash payment';
  end if;
  if booking.status <> 'COMPLETED' then
    raise exception using errcode = '22023', message = 'Booking is not completed';
  end if;

  expected_ref := 'MOCK-GCASH-' || upper(substr(replace(p_booking_id::text, '-', ''), 1, 12));
  if p_reference_number is null or p_reference_number <> expected_ref then
    raise exception using errcode = '22023', message = 'Invalid GCash mock reference number';
  end if;
  select * into payment from public.payments where booking_id = booking.id for update;
  if payment.id is not null then
    if payment.method = 'CASH' and payment.status in ('AWAITING_CONFIRMATIONS', 'SUCCESSFUL') then
      raise exception using errcode = '55000', message = 'Cash settlement is already in progress or completed';
    end if;
    if payment.method = 'GCASH' and payment.status = 'SUCCESSFUL' then
      return payment;
    end if;
  end if;

  select request.category_id
  into category_id
  from public.service_requests request
  where request.id = booking.service_request_id;
  rate_percent := public.get_effective_commission_rate(category_id);
  rate := rate_percent / 100;
  select coalesce((value #>> '{}')::numeric, 0)
  into homeowner_charge
  from public.system_settings
  where key = 'platform_settings.homeowner_charge';
  homeowner_charge := coalesce(homeowner_charge, 0);
  if homeowner_charge < 0 then
    raise exception using errcode = '22023', message = 'Invalid platform fee settings';
  end if;
  comm_amount := round(booking.agreed_service_amount * rate, 2);
  worker_net := booking.agreed_service_amount - comm_amount;
  idempotency_key := 'mock-gcash-' || booking.id::text;

  if payment.id is null then
    insert into public.payments(
      booking_id, method, provider, status, service_amount, commission_rate,
      commission_amount, worker_net_amount, homeowner_platform_charge,
      idempotency_key, provider_payment_id, proof_path
    ) values(
      booking.id, 'GCASH', 'MOCK_GCASH', 'PENDING', booking.agreed_service_amount,
      rate, comm_amount, worker_net, homeowner_charge,
      idempotency_key, p_reference_number, p_proof_path
    ) returning * into payment;
  else
    update public.payments
    set method = 'GCASH', provider = 'MOCK_GCASH', status = 'PENDING',
        service_amount = booking.agreed_service_amount, commission_rate = rate,
        commission_amount = comm_amount, worker_net_amount = worker_net,
        homeowner_platform_charge = homeowner_charge,
        provider_payment_id = p_reference_number, failure_reason = null,
        proof_path = coalesce(p_proof_path, payment.proof_path)
    where id = payment.id
    returning * into payment;
  end if;

  update public.payments
  set status = 'SUCCESSFUL', successful_at = coalesce(successful_at, now()), paid_at = coalesce(paid_at, now())
  where id = payment.id
  returning * into payment;
  insert into public.receipts(
    payment_id, receipt_number, service_amount, commission_rate,
    commission_amount, worker_net_amount, homeowner_platform_charge
  ) values(
    payment.id,
    'AYOS-' || upper(substr(replace(payment.id::text, '-', ''), 1, 12)),
    payment.service_amount,
    payment.commission_rate,
    payment.commission_amount,
    payment.worker_net_amount,
    payment.homeowner_platform_charge
  ) on conflict(payment_id) do nothing;
  return payment;
end;
$$;

-- Backward-compatible 2-arg wrapper.
create or replace function public.simulate_gcash_booking_payment(p_booking_id uuid, p_reference_number text)
returns public.payments
language sql
security definer
set search_path = ''
as $$
  select public.simulate_gcash_booking_payment(p_booking_id, p_reference_number, null);
$$;

revoke all on function public.simulate_gcash_booking_payment(uuid, text, text) from public, anon;
grant execute on function public.simulate_gcash_booking_payment(uuid, text, text) to authenticated;
revoke all on function public.simulate_gcash_booking_payment(uuid, text) from public, anon;
grant execute on function public.simulate_gcash_booking_payment(uuid, text) to authenticated;

notify pgrst, 'reload schema';
