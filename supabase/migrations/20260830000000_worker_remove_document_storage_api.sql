-- Re-align remove_worker_verification_document with the Storage API contract.
--
-- 20260829000000_worker_resubmit_missing_verification.sql re-created this
-- function and reintroduced a direct `delete from storage.objects`. Supabase's
-- storage.protect_delete trigger blocks that (42501 "Direct deletion from
-- storage tables is not allowed. Use the Storage API instead."), and even when
-- bypassed it would only delete the metadata row and orphan the S3 file.
--
-- The mobile client deletes the file first via
-- supabase.storage.from('verification-documents').remove([path]) and then
-- calls this RPC, which unlinks the path and audits the action. The RPC must
-- not touch storage.objects.

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

notify pgrst, 'reload schema';
