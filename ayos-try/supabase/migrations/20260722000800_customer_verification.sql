-- Customer government-ID verification and server-side booking gate.

alter table public.user_profiles
  add column if not exists verification_status text not null default 'unverified',
  add constraint user_profiles_verification_status_check
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected'));

create table if not exists public.customer_verifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  id_type text not null check (id_type in ('philsys', 'drivers_license', 'passport', 'umid', 'postal_id')),
  id_front_url text not null check (length(id_front_url) between 3 and 1024),
  id_back_url text check (id_back_url is null or length(id_back_url) between 3 and 1024),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_notes text check (review_notes is null or length(review_notes) <= 2000),
  reviewed_by uuid references public.accounts(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customer_verifications_one_pending
  on public.customer_verifications(customer_id) where status = 'pending';
create index if not exists customer_verifications_admin_queue
  on public.customer_verifications(status, created_at);

alter table public.customer_verifications enable row level security;
revoke all on public.customer_verifications from anon, authenticated;
grant select, insert on public.customer_verifications to authenticated;
grant select, insert, update, delete on public.customer_verifications to service_role;

drop policy if exists customer_verifications_owner_read on public.customer_verifications;
create policy customer_verifications_owner_read on public.customer_verifications
for select to authenticated using (customer_id = auth.uid() or public.is_admin(false));

drop policy if exists customer_verifications_admin_update on public.customer_verifications;
create policy customer_verifications_admin_update on public.customer_verifications
for update to authenticated using (public.is_admin(true)) with check (public.is_admin(true));

create or replace function public.submit_customer_verification(
  p_id_type text,
  p_front_url text,
  p_back_url text default null
) returns public.customer_verifications
language plpgsql security definer set search_path = '' as $$
declare result public.customer_verifications;
begin
  if public.current_role() <> 'USER' or not exists (
    select 1 from public.user_profiles profile where profile.account_id = auth.uid()
  ) then raise exception using errcode = '42501', message = 'CUSTOMER_REQUIRED'; end if;
  if p_id_type not in ('philsys', 'drivers_license', 'passport', 'umid', 'postal_id') then
    raise exception using errcode = '22023', message = 'INVALID_ID_TYPE';
  end if;
  if p_front_url not like auth.uid()::text || '/%'
    or (p_back_url is not null and p_back_url not like auth.uid()::text || '/%')
    or not exists (
      select 1 from storage.objects object
      where object.bucket_id = 'verification-documents'
        and object.name = p_front_url and object.owner_id = auth.uid()::text
    )
    or (p_back_url is not null and not exists (
      select 1 from storage.objects object
      where object.bucket_id = 'verification-documents'
        and object.name = p_back_url and object.owner_id = auth.uid()::text
    )) then
    raise exception using errcode = '22023', message = 'INVALID_VERIFICATION_DOCUMENT';
  end if;
  if exists (
    select 1 from public.customer_verifications verification
    where verification.customer_id = auth.uid() and verification.status = 'pending'
  ) then raise exception using errcode = '23505', message = 'VERIFICATION_ALREADY_PENDING'; end if;
  insert into public.customer_verifications(customer_id, id_type, id_front_url, id_back_url)
  values(auth.uid(), p_id_type, p_front_url, p_back_url)
  returning * into result;
  update public.user_profiles set verification_status = 'pending', updated_at = now()
  where account_id = auth.uid();
  return result;
end $$;

create or replace function public.admin_review_customer_verification(
  p_verification_id uuid,
  p_decision text,
  p_notes text default null
) returns public.customer_verifications
language plpgsql security definer set search_path = '' as $$
declare current_verification public.customer_verifications; result public.customer_verifications;
begin
  if not public.is_admin(true) then raise exception using errcode = '42501', message = 'ADMIN_REQUIRED'; end if;
  if lower(p_decision) not in ('approved', 'rejected') then
    raise exception using errcode = '22023', message = 'INVALID_REVIEW_DECISION';
  end if;
  select * into current_verification from public.customer_verifications
  where id = p_verification_id for update;
  if current_verification.id is null then raise exception using errcode = 'P0002', message = 'VERIFICATION_NOT_FOUND'; end if;
  if current_verification.status <> 'pending' then raise exception using errcode = '55000', message = 'VERIFICATION_ALREADY_REVIEWED'; end if;
  update public.customer_verifications
  set status = lower(p_decision), review_notes = nullif(btrim(p_notes), ''),
      reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = current_verification.id returning * into result;
  update public.user_profiles
  set verification_status = case when result.status = 'approved' then 'verified' else 'rejected' end,
      updated_at = now()
  where account_id = result.customer_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), 'CUSTOMER_VERIFICATION_REVIEWED', 'customer_verification', result.id::text,
    jsonb_build_object('decision', result.status, 'customer_id', result.customer_id));
  return result;
end $$;

create or replace function public.create_service_request(
  category_id uuid, address_id uuid, description text, scheduled_at timestamptz,
  budget numeric, notes text default null, ai_analysis_id uuid default null,
  notify_on_match boolean default false
) returns public.service_requests
language plpgsql security definer set search_path = '' as $$
declare result public.service_requests; address_location extensions.geography; selected_subdivision uuid;
begin
  if public.current_role() <> 'USER' then raise exception using errcode='42501', message='USER role required'; end if;
  if not exists (
    select 1 from public.user_profiles profile
    where profile.account_id = auth.uid() and profile.verification_status = 'verified'
  ) then raise exception using errcode = '42501', message = 'IDENTITY_VERIFICATION_REQUIRED'; end if;
  if not exists(select 1 from public.content_pages where key='TERMS' and published_at is not null) then
    raise exception using errcode='P0001', message='CONTENT_NOT_CONFIGURED';
  end if;
  select address.location, profile.subdivision_id into address_location, selected_subdivision
  from public.addresses address
  join public.user_profiles profile on profile.account_id = address.account_id
  where address.id = address_id and address.account_id = auth.uid();
  if address_location is null then raise exception using errcode='22023', message='ADDRESS_LOCATION_REQUIRED'; end if;
  if ai_analysis_id is not null and not exists(
    select 1 from public.ai_analyses where id=ai_analysis_id and account_id=auth.uid()
  ) then raise exception using errcode='42501', message='AI_ANALYSIS_UNAVAILABLE'; end if;
  if scheduled_at <= now() or budget <= 0 or length(trim(description)) not between 10 and 4000 then
    raise exception using errcode='22023', message='Invalid service request';
  end if;
  insert into public.service_requests(
    user_account_id, category_id, address_id, service_location, subdivision_id, description,
    scheduled_at, budget, notes, ai_analysis_id, notify_on_match, status
  ) values(
    auth.uid(), category_id, address_id, address_location, selected_subdivision, trim(description),
    scheduled_at, round(budget,2), nullif(trim(notes),''), ai_analysis_id, notify_on_match, 'OPEN'
  ) returning * into result;
  return result;
end $$;

revoke all on function public.submit_customer_verification(text, text, text) from public, anon;
revoke all on function public.admin_review_customer_verification(uuid, text, text) from public, anon;
grant execute on function public.submit_customer_verification(text, text, text) to authenticated;
grant execute on function public.admin_review_customer_verification(uuid, text, text) to authenticated;
