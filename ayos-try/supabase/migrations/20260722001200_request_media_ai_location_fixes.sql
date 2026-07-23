begin;
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/wav',
  'audio/webm'
]
where id = 'request-media';
create unique index if not exists request_media_request_path_unique
  on public.request_media(service_request_id, storage_path);
alter table public.ai_analysis_jobs
  drop constraint if exists ai_analysis_jobs_description_check;
alter table public.ai_analysis_jobs
  add constraint ai_analysis_jobs_description_or_media_check check (
    length(description) <= 4000
    and (
      length(btrim(description)) >= 10
      or jsonb_array_length(media_paths) > 0
    )
  );
create or replace function public.attach_request_media(
  p_service_request_id uuid,
  p_storage_path text,
  p_content_type text,
  p_byte_size integer
) returns public.request_media
language plpgsql security definer set search_path = '' as $$
declare result public.request_media;
begin
  if not exists (
    select 1 from public.service_requests r
    where r.id = p_service_request_id and r.user_account_id = auth.uid()
  ) then
    raise exception using errcode = '42501', message = 'Service request unavailable';
  end if;
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text
    or p_content_type not in (
      'image/jpeg', 'image/png', 'image/webp',
      'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/webm'
    )
    or p_byte_size not between 1 and 15728640 then
    raise exception using errcode = '22023', message = 'Invalid request media';
  end if;
  insert into public.request_media(service_request_id, storage_path, content_type, byte_size)
  values (p_service_request_id, p_storage_path, p_content_type, p_byte_size)
  on conflict(service_request_id, storage_path) do update
    set content_type = excluded.content_type,
        byte_size = excluded.byte_size
  returning * into result;
  return result;
end $$;
create or replace function public.save_geocoded_address(
  p_label text, p_line1 text, p_line2 text, p_barangay text, p_city text, p_province text,
  p_postal_code text, p_latitude numeric, p_longitude numeric, p_provider_id text,
  p_confidence numeric, p_payload jsonb, p_is_default boolean default false
) returns public.addresses language plpgsql security definer set search_path = '' as $$
declare result public.addresses;
begin
  if p_latitude not between 4.0 and 22.0 or p_longitude not between 116.0 and 127.0 then
    raise exception using errcode='22023', message='OUTSIDE_PHILIPPINES';
  end if;
  if nullif(btrim(p_line1), '') is null or nullif(btrim(p_barangay), '') is null
    or nullif(btrim(p_city), '') is null or nullif(btrim(p_province), '') is null then
    raise exception using errcode='22023', message='ADDRESS_COMPONENTS_REQUIRED';
  end if;
  if p_confidence is not null and p_confidence not between 0 and 1 then
    raise exception using errcode='22023', message='INVALID_GEOCODING_CONFIDENCE';
  end if;
  if p_is_default then
    update public.addresses set is_default = false where account_id = auth.uid();
  end if;
  insert into public.addresses(
    account_id, label, line1, line2, barangay, city, province, postal_code, is_default,
    location, geocoding_provider, geocoding_provider_id, geocoding_confidence, geocoding_payload
  ) values (
    auth.uid(), btrim(p_label), btrim(p_line1), nullif(btrim(p_line2), ''), btrim(p_barangay),
    btrim(p_city), btrim(p_province), nullif(btrim(p_postal_code), ''), p_is_default,
    private.make_location(p_latitude, p_longitude),
    case when nullif(btrim(p_provider_id), '') is null then 'MANUAL' else 'OPENROUTESERVICE' end,
    nullif(btrim(p_provider_id), ''), p_confidence, coalesce(p_payload, '{}')
  ) returning * into result;
  return result;
end $$;
commit;
