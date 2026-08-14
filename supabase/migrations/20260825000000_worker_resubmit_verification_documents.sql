-- Let a worker remove individual submitted verification documents while their
-- application is still editable (PENDING or NEEDS_DOCUMENTS), and resubmit a
-- fresh front/back pair. Direct table updates stay revoked; these security
-- definer RPCs are the only worker write path into worker_verifications.

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

revoke all on function public.remove_worker_verification_document(text) from public, anon;
revoke all on function public.resubmit_worker_verification_documents(text[]) from public, anon;
grant execute on function public.remove_worker_verification_document(text) to authenticated;
grant execute on function public.resubmit_worker_verification_documents(text[]) to authenticated;

notify pgrst, 'reload schema';
