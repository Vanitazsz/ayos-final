begin;

-- Relax worker onboarding validation: address and contact fields are now optional.
-- The frontend no longer collects office address or contact person during registration.

create or replace function public.submit_worker_onboarding_identity(
  p_identity_data jsonb,
  p_document_paths text[]
) returns public.worker_verifications
language plpgsql security definer set search_path = '' as $$
declare
  result public.worker_verifications;
  selected_industry_id uuid;
  selected_skill_ids uuid[];
  birthday_date date;
  uuid_pattern constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';
begin
  if public.current_role() is distinct from 'WORKER'
    or jsonb_typeof(p_identity_data) is distinct from 'object'
    or length(btrim(coalesce(p_identity_data->>'firstName', ''))) not between 1 and 80
    or length(btrim(coalesce(p_identity_data->>'lastName', ''))) not between 1 and 80
    or coalesce(p_identity_data->>'phone', '') !~ '^(09|\+639)[0-9]{9}$'
    or coalesce(p_identity_data->>'birthday', '') !~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
    or coalesce(p_identity_data->>'gender', '') not in ('', 'male', 'female', 'other')
    or p_identity_data->>'employmentType' not in ('employed', 'freelance')
    or coalesce(p_identity_data->>'idType', '') not in ('philsys','drivers_license','passport','umid','postal','prc','voters','senior','other')
    or jsonb_typeof(p_identity_data->'consents') is distinct from 'object'
    or p_identity_data->'consents'->'informationAccurate' is distinct from 'true'::jsonb
    or p_identity_data->'consents'->'privacy' is distinct from 'true'::jsonb
    or p_identity_data->'consents'->'terms' is distinct from 'true'::jsonb
    or coalesce(cardinality(p_document_paths), 0) <> 2
    or coalesce(p_identity_data->>'industryId', '') !~ uuid_pattern
    or jsonb_typeof(p_identity_data->'skillIds') is distinct from 'array'
    or jsonb_array_length(p_identity_data->'skillIds') not between 1 and 10
  then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_ONBOARDING';
  end if;

  begin
    birthday_date := to_date(p_identity_data->>'birthday', 'MM/DD/YYYY');
  exception when others then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_ONBOARDING';
  end;
  if to_char(birthday_date, 'MM/DD/YYYY') <> p_identity_data->>'birthday'
    or birthday_date > current_date then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_ONBOARDING';
  end if;

  if exists (
    select 1 from jsonb_array_elements_text(p_identity_data->'skillIds') item
    where item.value !~ uuid_pattern
  ) then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_SKILLS';
  end if;

  selected_industry_id := (p_identity_data->>'industryId')::uuid;
  select array_agg(distinct item.value::uuid)
  into selected_skill_ids
  from jsonb_array_elements_text(p_identity_data->'skillIds') item;

  if cardinality(selected_skill_ids) <> jsonb_array_length(p_identity_data->'skillIds')
    or not exists (
      select 1 from public.industries industry
      where industry.id = selected_industry_id and industry.is_active
    )
    or (
      select count(*) from public.service_categories category
      where category.id = any(selected_skill_ids)
        and category.industry_id = selected_industry_id
        and category.is_active
    ) <> cardinality(selected_skill_ids)
  then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_SKILLS';
  end if;

  if exists (
    select 1 from unnest(p_document_paths) path
    where path not like auth.uid()::text || '/%'
      or not exists (
        select 1 from storage.objects object
        where object.bucket_id = 'verification-documents'
          and object.name = path
          and object.owner_id = auth.uid()::text
      )
  ) then
    raise exception using errcode = '22023', message = 'INVALID_VERIFICATION_DOCUMENT';
  end if;

  insert into public.worker_verifications(worker_id, status, identity_data, document_paths)
  values (auth.uid(), 'PENDING', p_identity_data, p_document_paths)
  on conflict(worker_id) do update
  set status = 'PENDING',
      identity_data = excluded.identity_data,
      document_paths = excluded.document_paths,
      requested_notes = null,
      reviewed_by = null,
      reviewed_at = null,
      updated_at = now()
  where public.worker_verifications.status in ('PENDING', 'NEEDS_DOCUMENTS', 'REJECTED')
  returning * into result;

  if result.id is null then
    raise exception using errcode = '55000', message = 'VERIFICATION_CANNOT_BE_RESUBMITTED';
  end if;

  update public.worker_profiles
  set primary_industry_id = selected_industry_id,
      updated_at = now()
  where account_id = auth.uid();

  delete from public.worker_skills
  where worker_id = auth.uid()
    and category_id <> all(selected_skill_ids);

  insert into public.worker_skills(worker_id, category_id)
  select auth.uid(), skill_id from unnest(selected_skill_ids) skill_id
  on conflict(worker_id, category_id) do nothing;

  return result;
end $$;

revoke all on function public.submit_worker_onboarding_identity(jsonb, text[]) from public, anon;
grant execute on function public.submit_worker_onboarding_identity(jsonb, text[]) to authenticated;

commit;
