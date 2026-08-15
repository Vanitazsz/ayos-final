-- Let a worker whose application never completed finish it from the
-- verification screen by uploading their ID documents. When no
-- worker_verifications row exists, resubmit_worker_verification_documents
-- creates one instead of erroring, deriving the available identity fields from
-- the worker's existing profile. remove_worker_verification_document still
-- rejects when there is no verification on file.

begin;

create or replace function public.remove_worker_verification_document(p_document_path text)
returns public.worker_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_row public.worker_verifications;
  result public.worker_verifications;
begin
  if public.current_role() is distinct from 'WORKER' then
    raise exception using errcode = '42501', message = 'WORKER_ROLE_REQUIRED';
  end if;

  if p_document_path is null or p_document_path not like auth.uid()::text || '/%' then
    raise exception using errcode = '22023', message = 'INVALID_DOCUMENT_PATH';
  end if;

  if not exists (
    select 1 from public.worker_verifications where worker_id = auth.uid()
  ) then
    raise exception using errcode = 'P0002', message = 'VERIFICATION_NOT_FOUND';
  end if;

  select *
  into current_row
  from public.worker_verifications
  where worker_id = auth.uid()
    and status in ('PENDING', 'NEEDS_DOCUMENTS')
  for update;

  if current_row.id is null then
    raise exception using errcode = '55000', message = 'VERIFICATION_NOT_ACTIONABLE';
  end if;

  if not (p_document_path = any(current_row.document_paths)) then
    raise exception using errcode = '22023', message = 'DOCUMENT_NOT_FOUND';
  end if;

  delete from storage.objects
  where bucket_id = 'verification-documents'
    and name = p_document_path
    and owner_id = auth.uid()::text;

  update public.worker_verifications
  set document_paths = array_remove(document_paths, p_document_path),
      updated_at = now()
  where id = current_row.id
  returning * into result;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'WORKER_VERIFICATION_DOCUMENT_REMOVED',
    'worker_verification',
    result.id::text,
    jsonb_build_object('path', p_document_path)
  );

  return result;
end $$;

revoke all on function public.remove_worker_verification_document(text) from public, anon;
grant execute on function public.remove_worker_verification_document(text) to authenticated;

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
