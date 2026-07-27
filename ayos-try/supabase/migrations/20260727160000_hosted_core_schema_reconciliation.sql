begin;

-- The hosted project recorded several 2026-07-21/22 migrations as applied
-- without their durable table changes. Reconcile only the additive columns and
-- constraints required by the booking, payment, privacy, media, and locale
-- contracts. Existing hosted rows and legacy tables are preserved.

alter table public.bookings
  add column if not exists agreed_service_amount numeric(12,2),
  add column if not exists currency text default 'PHP',
  add column if not exists worker_start_lat double precision,
  add column if not exists worker_start_lng double precision;

update public.bookings booking
set agreed_service_amount = request.budget
from public.service_requests request
where request.id = booking.service_request_id
  and booking.agreed_service_amount is null;

do $$
begin
  if exists (
    select 1 from public.bookings where agreed_service_amount is null
  ) then
    raise exception using
      errcode = '23502',
      message = 'HOSTED_BOOKING_PRICE_RECONCILIATION_FAILED';
  end if;
end
$$;

alter table public.bookings
  alter column agreed_service_amount set not null,
  alter column currency set default 'PHP',
  alter column currency set not null;

alter table public.bookings
  drop constraint if exists bookings_currency_check;
alter table public.bookings
  add constraint bookings_currency_check check (currency = 'PHP');

update public.bookings booking
set worker_start_lat = extensions.st_y(worker.service_origin::extensions.geometry),
    worker_start_lng = extensions.st_x(worker.service_origin::extensions.geometry)
from public.worker_profiles worker
where worker.account_id = booking.worker_account_id
  and worker.service_origin is not null
  and (booking.worker_start_lat is null or booking.worker_start_lng is null);

alter table public.payments
  add column if not exists currency text default 'PHP',
  add column if not exists provider text,
  add column if not exists provider_payment_id text,
  add column if not exists paid_at timestamptz;

alter table public.payments
  alter column currency set default 'PHP',
  alter column currency set not null;

alter table public.payments
  drop constraint if exists payments_currency_check;
alter table public.payments
  add constraint payments_currency_check check (currency = 'PHP');
alter table public.payments
  drop constraint if exists payments_provider_check;
alter table public.payments
  add constraint payments_provider_check
  check (provider is null or provider = 'PAYMONGO');

alter table public.cancellations
  add column if not exists reason_code text,
  add column if not exists initiator_role public.account_role,
  add column if not exists job_stage text,
  add column if not exists fee_amount numeric(12,2) default 0,
  add column if not exists refund_amount numeric(12,2) default 0,
  add column if not exists resolution_status text default 'CONFIRMED';

update public.cancellations
set fee_amount = coalesce(fee_amount, 0),
    refund_amount = coalesce(refund_amount, 0),
    resolution_status = coalesce(resolution_status, 'CONFIRMED');

alter table public.cancellations
  alter column fee_amount set default 0,
  alter column fee_amount set not null,
  alter column refund_amount set default 0,
  alter column refund_amount set not null,
  alter column resolution_status set default 'CONFIRMED',
  alter column resolution_status set not null;

alter table public.cancellations
  drop constraint if exists cancellations_job_stage_check;
alter table public.cancellations
  add constraint cancellations_job_stage_check check (
    job_stage is null or job_stage in (
      'BEFORE_ACCEPTANCE',
      'BEFORE_TRAVEL',
      'TRAVELLING',
      'EN_ROUTE',
      'ARRIVED',
      'SERVICE_STARTED',
      'IN_PROGRESS'
    )
  );
alter table public.cancellations
  drop constraint if exists cancellations_reason_code_format_check;
alter table public.cancellations
  add constraint cancellations_reason_code_format_check
  check (reason_code is null or reason_code ~ '^[A-Z][A-Z0-9_]{2,79}$');
alter table public.cancellations
  drop constraint if exists cancellations_fee_amount_check;
alter table public.cancellations
  add constraint cancellations_fee_amount_check check (fee_amount >= 0);
alter table public.cancellations
  drop constraint if exists cancellations_refund_amount_check;
alter table public.cancellations
  add constraint cancellations_refund_amount_check check (refund_amount >= 0);
alter table public.cancellations
  drop constraint if exists cancellations_resolution_status_check;
alter table public.cancellations
  add constraint cancellations_resolution_status_check
  check (resolution_status in ('PENDING', 'CONFIRMED', 'DISPUTED', 'RESOLVED'));

alter table public.user_profiles
  add column if not exists preferred_locale text default 'en';
alter table public.worker_profiles
  add column if not exists preferred_locale text default 'en';

update public.user_profiles set preferred_locale = 'en' where preferred_locale is null;
update public.worker_profiles set preferred_locale = 'en' where preferred_locale is null;

alter table public.user_profiles
  alter column preferred_locale set default 'en',
  alter column preferred_locale set not null;
alter table public.worker_profiles
  alter column preferred_locale set default 'en',
  alter column preferred_locale set not null;

alter table public.user_profiles
  drop constraint if exists user_profiles_preferred_locale_check;
alter table public.user_profiles
  add constraint user_profiles_preferred_locale_check
  check (preferred_locale in ('en', 'fil'));
alter table public.worker_profiles
  drop constraint if exists worker_profiles_preferred_locale_check;
alter table public.worker_profiles
  add constraint worker_profiles_preferred_locale_check
  check (preferred_locale in ('en', 'fil'));

alter table public.service_requests
  add column if not exists address_snapshot jsonb;
alter table public.conversation_participants
  add column if not exists last_read_at timestamptz;

create unique index if not exists request_media_request_path_unique
  on public.request_media(service_request_id, storage_path);

select pg_notify('pgrst', 'reload schema');

commit;
