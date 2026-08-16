-- Let a worker delete their entire verification submission while it is still
-- editable (PENDING or NEEDS_DOCUMENTS). The storage objects for the submitted
-- ID documents are removed by the client through the Storage API
-- (supabase.storage.from('verification-documents').remove(paths)) before this
-- RPC runs; direct deletion from storage.objects is blocked by Supabase and
-- would orphan the S3 files. This RPC only deletes the worker_verifications row
-- (cascading any worker_verification_documents rows), resets the worker profile
-- to its initial un-submitted state, and audits the action.

create or replace function public.delete_worker_verification()
returns public.worker_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.worker_verifications;
begin
  if public.current_role() is distinct from 'WORKER' then
    raise exception using errcode = '42501', message = 'WORKER_ROLE_REQUIRED';
  end if;

  select *
  into result
  from public.worker_verifications
  where worker_id = auth.uid()
    and status in ('PENDING', 'NEEDS_DOCUMENTS')
  for update;

  if result.id is null then
    if exists (select 1 from public.worker_verifications where worker_id = auth.uid()) then
      raise exception using errcode = '55000', message = 'VERIFICATION_NOT_DELETABLE';
    end if;
    raise exception using errcode = 'P0002', message = 'VERIFICATION_NOT_FOUND';
  end if;

  delete from public.worker_verifications
  where id = result.id
  returning * into result;

  update public.worker_profiles
  set approval_status = 'PENDING',
      is_available = false,
      approved_at = null,
      updated_at = now()
  where account_id = auth.uid();

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'WORKER_VERIFICATION_DELETED',
    'worker_verification',
    result.id::text,
    jsonb_build_object('document_paths', result.document_paths)
  );

  return result;
end $$;

revoke all on function public.delete_worker_verification() from public, anon;
grant execute on function public.delete_worker_verification() to authenticated;

notify pgrst, 'reload schema';
