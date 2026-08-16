-- Admin rejection of a worker identity verification.
--
-- Replaces the admin Workers page "Request documents" action
-- (review_worker_verification with decision 'NEEDS_DOCUMENTS') with a reject
-- that deletes the worker's submission so they can resubmit fresh documents.
--
-- The RPC marks the verification REJECTED, clears the submitted document
-- paths, and returns the removed paths. The actual storage objects are removed
-- by the admin client through the Storage API
-- (supabase.storage.from('verification-documents').remove(paths)) after the
-- RPC returns, because a raw SQL delete on storage.objects is blocked by the
-- storage.protect_delete() trigger. The verification_documents_admin_delete
-- policy below lets the admin client perform that removal.
--
-- Also patches resubmit_worker_verification_documents so a rejected worker who
-- resubmits is pushed back to approval_status = 'PENDING' (today only the
-- first-submission branch resets the profile, so a rejected->resubmitted
-- worker would otherwise stay REJECTED and not re-enter the review queue).
-- Run in the Supabase SQL editor or via `supabase db push`. Idempotent.

begin;

create or replace function public.admin_reject_worker_verification(
  p_verification_id uuid,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  verification public.worker_verifications;
  removed_paths text[] := '{}';
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  select *
  into verification
  from public.worker_verifications
  where id = p_verification_id
  for update;

  if verification.id is null then
    raise exception using errcode = 'P0002', message = 'VERIFICATION_NOT_FOUND';
  end if;

  if verification.status not in ('PENDING', 'NEEDS_DOCUMENTS') then
    raise exception using errcode = '55000', message = 'VERIFICATION_NOT_ACTIONABLE';
  end if;

  removed_paths := coalesce(verification.document_paths, '{}');

  update public.worker_verifications
  set status = 'REJECTED',
      requested_notes = nullif(btrim(p_notes), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      document_paths = '{}',
      updated_at = now()
  where id = verification.id;

  update public.worker_profiles
  set approval_status = 'REJECTED',
      approved_at = null,
      is_available = false,
      updated_at = now()
  where account_id = verification.worker_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'WORKER_VERIFICATION_REJECTED',
    'worker_verification',
    verification.id::text,
    jsonb_build_object(
      'worker_id', verification.worker_id,
      'decision', 'REJECTED',
      'cleared_documents', removed_paths
    )
  );

  return jsonb_build_object(
    'verification_id', verification.id,
    'worker_id', verification.worker_id,
    'removed_document_paths', removed_paths
  );
end;
$$;

revoke all on function public.admin_reject_worker_verification(uuid, text) from public, anon;
grant execute on function public.admin_reject_worker_verification(uuid, text) to authenticated;

-- Let the admin client remove verification-document objects through the
-- Storage API after a reject.
drop policy if exists verification_documents_admin_delete on storage.objects;
create policy verification_documents_admin_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'verification-documents'
  and public.is_admin(true)
);

-- Resubmission must push the worker back to PENDING so they re-enter the
-- review queue after a reject (and after a NEEDS_DOCUMENTS request).
create or replace function public.resubmit_worker_verification_documents(p_document_paths text[])
returns public.worker_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare result public.worker_verifications;
begin
  if public.current_role() is distinct from 'WORKER' then
    raise exception using errcode = '42501', message = 'WORKER_ROLE_REQUIRED';
  end if;

  if coalesce(cardinality(p_document_paths), 0) <> 2
    or exists (
      select 1 from unnest(p_document_paths) path
      where path not like auth.uid()::text || '/%'
        or not exists (
          select 1 from storage.objects object
          where object.bucket_id = 'verification-documents'
            and object.name = path
            and object.owner_id = auth.uid()::text
        )
    )
  then
    raise exception using errcode = '22023', message = 'INVALID_VERIFICATION_DOCUMENT';
  end if;

  -- First submission: the worker's application never reached a verification
  -- row. Create one now from their existing profile, then fall through to the
  -- resubmission audit below.
  if not exists (
    select 1 from public.worker_verifications where worker_id = auth.uid()
  ) then
    insert into public.worker_verifications(worker_id, status, identity_data, document_paths)
    select auth.uid(), 'PENDING',
      jsonb_build_object(
        'displayName', profile.display_name,
        'phone', account.mobile
      ),
      p_document_paths
    from public.accounts account
    join public.worker_profiles profile on profile.account_id = account.id
    where account.id = auth.uid()
    returning * into result;

    if result is null then
      raise exception using errcode = 'P0002', message = 'WORKER_PROFILE_NOT_FOUND';
    end if;

    update public.worker_profiles
    set approval_status = 'PENDING',
        approved_at = null,
        is_available = false,
        updated_at = now()
    where account_id = auth.uid();

    insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(),
      'WORKER_VERIFICATION_DOCUMENTS_RESUBMITTED',
      'worker_verification',
      result.id::text,
      jsonb_build_object('document_paths', p_document_paths, 'first_submission', true)
    );

    return result;
  end if;

  update public.worker_verifications
  set document_paths = p_document_paths,
      status = 'PENDING',
      requested_notes = null,
      reviewed_by = null,
      reviewed_at = null,
      updated_at = now()
  where worker_id = auth.uid()
    and status in ('PENDING', 'NEEDS_DOCUMENTS', 'REJECTED')
  returning * into result;

  if result.id is null then
    raise exception using errcode = '55000', message = 'VERIFICATION_CANNOT_BE_RESUBMITTED';
  end if;

  update public.worker_profiles
  set approval_status = 'PENDING',
      approved_at = null,
      is_available = false,
      updated_at = now()
  where account_id = auth.uid();

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'WORKER_VERIFICATION_DOCUMENTS_RESUBMITTED',
    'worker_verification',
    result.id::text,
    jsonb_build_object('document_paths', p_document_paths)
  );

  return result;
end $$;

revoke all on function public.resubmit_worker_verification_documents(text[]) from public, anon;
grant execute on function public.resubmit_worker_verification_documents(text[]) to authenticated;

notify pgrst, 'reload schema';

commit;
