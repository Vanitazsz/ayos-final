begin;

-- Reconcile a hosted schema drift: the migration history reported the wallet
-- top-up migrations as applied, but the table and manual top-up RPCs were
-- absent. Keep this repair idempotent so it is safe when the objects already
-- exist.

create table if not exists public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  wallet_account_id uuid not null,
  status text not null default 'PENDING',
  amount_centavos bigint not null check (amount_centavos > 0),
  currency text not null default 'PHP' check (currency = 'PHP'),
  provider text not null default 'MANUAL' check (provider = 'MANUAL'),
  idempotency_key text not null unique,
  provider_intent_id text,
  provider_payment_method_id text,
  provider_payment_id text,
  redirect_url text,
  return_url text,
  failure_reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  channel text,
  reference_number text,
  proof_path text,
  submitted_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text
);

alter table public.wallet_topups
  add column if not exists channel text,
  add column if not exists reference_number text,
  add column if not exists proof_path text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.wallet_topups'::regclass
      and conname = 'wallet_topups_reviewed_by_fkey'
  ) then
    alter table public.wallet_topups
      add constraint wallet_topups_reviewed_by_fkey
      foreign key (reviewed_by)
      references public.admin_profiles(account_id)
      on delete set null;
  end if;

  alter table public.wallet_topups
    drop constraint if exists wallet_topups_provider_check;
  alter table public.wallet_topups
    add constraint wallet_topups_provider_check
    check (provider in ('MANUAL', 'PAYMONGO'));

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.wallet_topups'::regclass
      and conname = 'wallet_topups_status_check'
  ) then
    alter table public.wallet_topups
      add constraint wallet_topups_status_check check (
        status in (
          'PENDING', 'REQUIRES_ACTION', 'PROCESSING', 'SUCCESSFUL',
          'FAILED', 'EXPIRED', 'CANCELLED'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.wallet_topups'::regclass
      and conname = 'wallet_topups_channel_check'
  ) then
    alter table public.wallet_topups
      add constraint wallet_topups_channel_check
      check (channel is null or channel in ('GCASH', 'BANK'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.wallet_topups'::regclass
      and conname = 'wallet_topups_reference_check'
  ) then
    alter table public.wallet_topups
      add constraint wallet_topups_reference_check
      check (reference_number is null or length(reference_number) between 4 and 120);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.wallet_topups'::regclass
      and conname = 'wallet_topups_proof_path_check'
  ) then
    alter table public.wallet_topups
      add constraint wallet_topups_proof_path_check
      check (proof_path is null or length(proof_path) between 3 and 1024);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.wallet_topups'::regclass
      and conname = 'wallet_topups_review_notes_check'
  ) then
    alter table public.wallet_topups
      add constraint wallet_topups_review_notes_check
      check (review_notes is null or length(review_notes) <= 2000);
  end if;
end;
$$;

create index if not exists wallet_topups_wallet_time_idx
  on public.wallet_topups(wallet_account_id, created_at desc);

create unique index if not exists wallet_topups_manual_reference_unique
  on public.wallet_topups(channel, lower(reference_number))
  where provider = 'MANUAL' and status <> 'FAILED' and reference_number is not null;

alter table public.wallet_topups enable row level security;
revoke all on public.wallet_topups from anon, authenticated;
grant select on public.wallet_topups to authenticated, service_role;

drop policy if exists wallet_topups_owner_or_admin_read on public.wallet_topups;
create policy wallet_topups_owner_or_admin_read
  on public.wallet_topups
  for select to authenticated
  using (
    exists (
      select 1
      from public.wallet_accounts wallet
      where wallet.id = wallet_account_id
        and (wallet.account_id = (select auth.uid()) or public.is_admin(false))
    )
  );

drop trigger if exists set_wallet_topups_updated_at on public.wallet_topups;
create trigger set_wallet_topups_updated_at
  before update on public.wallet_topups
  for each row execute function public.set_updated_at();

create or replace function public.submit_manual_wallet_topup(
  p_amount_centavos bigint,
  p_channel text,
  p_reference_number text,
  p_proof_path text,
  p_idempotency_key text
) returns public.wallet_topups
language plpgsql security definer set search_path = '' as $$
declare
  wallet record;
  existing_topup public.wallet_topups;
  result public.wallet_topups;
begin
  if public.current_role() <> 'WORKER'
    or p_amount_centavos not between 10000 and 10000000
    or p_channel not in ('GCASH', 'BANK')
    or length(trim(coalesce(p_reference_number, ''))) not between 4 and 120
    or length(p_idempotency_key) not between 16 and 128
    or not p_proof_path like auth.uid()::text || '/%' then
    raise exception using errcode = '22023', message = 'INVALID_TOPUP_REQUEST';
  end if;
  if not exists (
    select 1 from storage.objects object
    where object.bucket_id = 'topup-proofs'
      and object.name = p_proof_path
      and object.owner_id = auth.uid()::text
  ) then
    raise exception using errcode = '22023', message = 'TOPUP_PROOF_REQUIRED';
  end if;

  select * into existing_topup
  from public.wallet_topups where idempotency_key = p_idempotency_key;
  if existing_topup.id is not null then
    if existing_topup.amount_centavos <> p_amount_centavos
      or existing_topup.reference_number <> trim(p_reference_number) then
      raise exception using errcode = '23505', message = 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return existing_topup;
  end if;

  insert into public.wallet_accounts(account_id) values (auth.uid())
  on conflict(account_id) do update set updated_at = now()
  returning * into wallet;
  if wallet.status <> 'ACTIVE' then
    raise exception using errcode = '42501', message = 'WALLET_UNAVAILABLE';
  end if;

  insert into public.wallet_topups(
    wallet_account_id, status, amount_centavos, provider, idempotency_key,
    channel, reference_number, proof_path, submitted_at
  ) values (
    wallet.id, 'PENDING', p_amount_centavos, 'MANUAL', p_idempotency_key,
    p_channel, trim(p_reference_number), p_proof_path, now()
  ) returning * into result;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'MANUAL_TOPUP_SUBMITTED', 'wallet_topup', result.id::text,
    jsonb_build_object(
      'channel', result.channel,
      'amount_centavos', result.amount_centavos,
      'reference_hash', encode(extensions.digest(result.reference_number, 'sha256'), 'hex')
    )
  );
  return result;
end $$;

create or replace function public.admin_review_wallet_topup(
  p_topup_id uuid,
  p_decision text,
  p_notes text default null
) returns public.wallet_topups
language plpgsql security definer set search_path = '' as $$
declare
  topup public.wallet_topups;
  result public.wallet_topups;
begin
  if not public.is_admin(false)
    or coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2'
    or p_decision not in ('APPROVED', 'REJECTED') then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  if p_decision = 'REJECTED' and length(trim(coalesce(p_notes, ''))) < 3 then
    raise exception using errcode = '22023', message = 'REJECTION_REASON_REQUIRED';
  end if;
  select * into topup from public.wallet_topups where id = p_topup_id for update;
  if topup.id is null or topup.provider <> 'MANUAL' or topup.status <> 'PENDING' then
    raise exception using errcode = '55000', message = 'TOPUP_CANNOT_BE_REVIEWED';
  end if;

  update public.wallet_topups
  set status = case when p_decision = 'APPROVED' then 'SUCCESSFUL' else 'FAILED' end,
      reviewed_by = auth.uid(), reviewed_at = now(), completed_at = now(),
      review_notes = nullif(trim(coalesce(p_notes, '')), ''),
      failure_reason = case when p_decision = 'REJECTED' then trim(p_notes) else null end
  where id = topup.id
  returning * into result;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'MANUAL_TOPUP_' || p_decision, 'wallet_topup', topup.id::text,
    jsonb_build_object('notes', p_notes)
  );
  return result;
end $$;

revoke all on function public.submit_manual_wallet_topup(bigint, text, text, text, text)
  from public, anon;
grant execute on function public.submit_manual_wallet_topup(bigint, text, text, text, text)
  to authenticated;
revoke all on function public.admin_review_wallet_topup(uuid, text, text)
  from public, anon;
grant execute on function public.admin_review_wallet_topup(uuid, text, text)
  to authenticated;

notify pgrst, 'reload schema';

commit;
