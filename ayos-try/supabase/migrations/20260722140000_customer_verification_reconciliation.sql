-- Reconcile customer identity verification on hosted environments without
-- depending on the subdivision and booking migrations.

alter table public.user_profiles
  add column if not exists verification_status text not null default 'unverified';

update public.user_profiles
set verification_status = 'unverified'
where verification_status not in ('unverified', 'pending', 'verified', 'rejected');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_profiles'::regclass
      and conname = 'user_profiles_verification_status_check'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_verification_status_check
      check (verification_status in ('unverified', 'pending', 'verified', 'rejected'));
  end if;
end $$;

create table if not exists public.customer_verifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  id_type text not null
    check (id_type in ('philsys', 'drivers_license', 'passport', 'umid', 'postal_id')),
  id_front_url text not null check (length(id_front_url) between 3 and 1024),
  id_back_url text check (id_back_url is null or length(id_back_url) between 3 and 1024),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  review_notes text check (review_notes is null or length(review_notes) <= 2000),
  reviewed_by uuid references public.accounts(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_verifications
  add column if not exists review_notes text,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists customer_verifications_one_pending
  on public.customer_verifications(customer_id)
  where status = 'pending';

create index if not exists customer_verifications_admin_queue
  on public.customer_verifications(status, created_at);

alter table public.customer_verifications enable row level security;
revoke all on public.customer_verifications from anon, authenticated;
grant select on public.customer_verifications to authenticated;
grant select, insert, update, delete on public.customer_verifications to service_role;

drop policy if exists customer_verifications_owner_or_admin_read
  on public.customer_verifications;
create policy customer_verifications_owner_or_admin_read
on public.customer_verifications for select to authenticated
using (customer_id = auth.uid() or public.is_admin(false));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-documents',
  'verification-documents',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists customer_verification_documents_owner_upload on storage.objects;
create policy customer_verification_documents_owner_upload
on storage.objects for insert to authenticated
with check (
  bucket_id = 'verification-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists customer_verification_documents_owner_or_admin_read on storage.objects;
create policy customer_verification_documents_owner_or_admin_read
on storage.objects for select to authenticated
using (
  bucket_id = 'verification-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin(false)
  )
);

drop policy if exists customer_verification_documents_owner_delete on storage.objects;
create policy customer_verification_documents_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'verification-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.submit_customer_verification(
  p_id_type text,
  p_front_url text,
  p_back_url text default null
) returns public.customer_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.customer_verifications;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if public.current_role() <> 'USER'
     or not exists (
       select 1
       from public.user_profiles profile
       where profile.account_id = auth.uid()
     ) then
    raise exception using errcode = '42501', message = 'CUSTOMER_REQUIRED';
  end if;

  if p_id_type not in ('philsys', 'drivers_license', 'passport', 'umid', 'postal_id') then
    raise exception using errcode = '22023', message = 'INVALID_ID_TYPE';
  end if;

  if p_front_url not like auth.uid()::text || '/%'
     or p_back_url is null
     or p_back_url not like auth.uid()::text || '/%'
     or not exists (
       select 1
       from storage.objects object
       where object.bucket_id = 'verification-documents'
         and object.name = p_front_url
         and object.owner_id = auth.uid()::text
     )
     or not exists (
       select 1
       from storage.objects object
       where object.bucket_id = 'verification-documents'
         and object.name = p_back_url
         and object.owner_id = auth.uid()::text
     ) then
    raise exception using errcode = '22023', message = 'INVALID_VERIFICATION_DOCUMENT';
  end if;

  if exists (
    select 1
    from public.customer_verifications verification
    where verification.customer_id = auth.uid()
      and verification.status = 'pending'
  ) then
    raise exception using errcode = '23505', message = 'VERIFICATION_ALREADY_PENDING';
  end if;

  insert into public.customer_verifications(
    customer_id,
    id_type,
    id_front_url,
    id_back_url
  ) values (
    auth.uid(),
    p_id_type,
    p_front_url,
    p_back_url
  )
  returning * into result;

  update public.user_profiles
  set verification_status = 'pending',
      updated_at = now()
  where account_id = auth.uid();

  return result;
end;
$$;

create or replace function public.admin_review_customer_verification(
  p_verification_id uuid,
  p_decision text,
  p_notes text default null
) returns public.customer_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_verification public.customer_verifications;
  result public.customer_verifications;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  if lower(p_decision) not in ('approved', 'rejected') then
    raise exception using errcode = '22023', message = 'INVALID_REVIEW_DECISION';
  end if;

  select *
  into current_verification
  from public.customer_verifications
  where id = p_verification_id
  for update;

  if current_verification.id is null then
    raise exception using errcode = 'P0002', message = 'VERIFICATION_NOT_FOUND';
  end if;

  if current_verification.status <> 'pending' then
    raise exception using errcode = '55000', message = 'VERIFICATION_ALREADY_REVIEWED';
  end if;

  update public.customer_verifications
  set status = lower(p_decision),
      review_notes = nullif(btrim(p_notes), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = current_verification.id
  returning * into result;

  update public.user_profiles
  set verification_status = case
        when result.status = 'approved' then 'verified'
        else 'rejected'
      end,
      updated_at = now()
  where account_id = result.customer_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'CUSTOMER_VERIFICATION_REVIEWED',
    'customer_verification',
    result.id::text,
    jsonb_build_object(
      'decision', result.status,
      'customer_id', result.customer_id
    )
  );

  return result;
end;
$$;

revoke all on function public.submit_customer_verification(text, text, text)
  from public, anon;
revoke all on function public.admin_review_customer_verification(uuid, text, text)
  from public, anon;
grant execute on function public.submit_customer_verification(text, text, text)
  to authenticated;
grant execute on function public.admin_review_customer_verification(uuid, text, text)
  to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'customer_verifications'
  ) then
    alter publication supabase_realtime add table public.customer_verifications;
  end if;
end $$;

notify pgrst, 'reload schema';
