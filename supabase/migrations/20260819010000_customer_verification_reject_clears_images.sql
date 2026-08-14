-- When an administrator rejects a customer verification, clear the submitted
-- ID document images: null the URLs on the rejected row and delete the files
-- from the verification-documents bucket. Approval keeps the documents.
-- Run in the Supabase SQL editor or via `supabase db push`.

alter table public.customer_verifications
  alter column id_front_url drop not null;

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
  old_front text;
  old_back text;
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

  old_front := current_verification.id_front_url;
  old_back := current_verification.id_back_url;

  update public.customer_verifications
  set status = lower(p_decision),
      review_notes = nullif(btrim(p_notes), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now(),
      id_front_url = case when lower(p_decision) = 'rejected' then null else current_verification.id_front_url end,
      id_back_url = case when lower(p_decision) = 'rejected' then null else current_verification.id_back_url end
  where id = current_verification.id
  returning * into result;

  update public.user_profiles
  set verification_status = case when result.status = 'approved' then 'verified' else 'rejected' end,
      updated_at = now()
  where account_id = result.customer_id;

  if result.status = 'rejected' then
    delete from storage.objects
    where bucket_id = 'verification-documents'
      and (name = old_front or name = old_back);
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'CUSTOMER_VERIFICATION_REVIEWED',
    'customer_verification',
    result.id::text,
    jsonb_build_object(
      'decision', result.status,
      'customer_id', result.customer_id,
      'cleared_images', result.status = 'rejected'
    )
  );

  return result;
end;
$$;

revoke all on function public.admin_review_customer_verification(uuid, text, text) from public, anon;
grant execute on function public.admin_review_customer_verification(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
