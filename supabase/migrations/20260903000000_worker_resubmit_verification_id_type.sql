-- Let a worker record which government ID they are resubmitting. The ID type
-- is collected on initial worker registration (identity_data.idType) and on
-- customer verification, but the worker resubmission RPC previously accepted
-- only the front/back document pair. This migration adds a p_id_type argument
-- so a resubmission can update identity_data.idType alongside the documents.

begin;

create or replace function public.resubmit_worker_verification_documents(p_document_paths text[], p_id_type text)
returns public.worker_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.worker_verifications;
  existing_identity jsonb;
begin
  if public.current_role() is distinct from 'WORKER' then
    raise exception using errcode = '42501', message = 'WORKER_ROLE_REQUIRED';
  end if;

  if coalesce(p_id_type, '') not in ('philsys','drivers_license','passport','umid','postal','prc','voters','senior','other') then
    raise exception using errcode = '22023', message = 'INVALID_ID_TYPE';
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

  select identity_data into existing_identity
  from public.worker_verifications
  where worker_id = auth.uid();

  -- First submission: the worker's application never reached a verification
  -- row. Create one now from their existing profile plus the chosen ID type,
  -- then fall through to the resubmission audit below.
  if existing_identity is null then
    insert into public.worker_verifications(worker_id, status, identity_data, document_paths)
    select auth.uid(), 'PENDING',
      jsonb_build_object(
        'displayName', profile.display_name,
        'phone', account.mobile,
        'idType', p_id_type
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
      jsonb_build_object('document_paths', p_document_paths, 'first_submission', true, 'id_type', p_id_type)
    );

    return result;
  end if;

  update public.worker_verifications
  set document_paths = p_document_paths,
      identity_data = jsonb_set(
        coalesce(existing_identity, '{}'::jsonb),
        '{idType}',
        to_jsonb(p_id_type),
        true
      ),
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
    jsonb_build_object('document_paths', p_document_paths, 'id_type', p_id_type)
  );

  return result;
end $$;

revoke all on function public.resubmit_worker_verification_documents(text[], text) from public, anon;
grant execute on function public.resubmit_worker_verification_documents(text[], text) to authenticated;

notify pgrst, 'reload schema';

commit;
