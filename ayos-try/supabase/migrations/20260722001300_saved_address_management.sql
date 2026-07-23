-- Customer-managed saved addresses for reuse during service requests.

create or replace function public.upsert_my_address(
  p_id uuid,
  p_label text,
  p_line1 text,
  p_line2 text,
  p_barangay text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_latitude numeric,
  p_longitude numeric,
  p_is_default boolean
) returns public.addresses
language plpgsql security definer set search_path = '' as $$
declare result public.addresses;
begin
  if public.current_role() <> 'USER' then
    raise exception using errcode = '42501', message = 'CUSTOMER_REQUIRED';
  end if;
  if nullif(btrim(p_label), '') is null
    or nullif(btrim(p_line1), '') is null
    or nullif(btrim(p_barangay), '') is null
    or nullif(btrim(p_city), '') is null
    or nullif(btrim(p_province), '') is null then
    raise exception using errcode = '22023', message = 'ADDRESS_COMPONENTS_REQUIRED';
  end if;
  if p_latitude not between 4.0 and 22.0 or p_longitude not between 116.0 and 127.0 then
    raise exception using errcode = '22023', message = 'OUTSIDE_PHILIPPINES';
  end if;

  if p_is_default then
    update public.addresses set is_default = false
    where account_id = auth.uid() and archived_at is null;
  end if;

  if p_id is null then
    insert into public.addresses(
      account_id, label, line1, line2, barangay, city, province, postal_code,
      location, is_default, archived_at, geocoding_provider, geocoding_payload
    ) values (
      auth.uid(), btrim(p_label), btrim(p_line1), nullif(btrim(p_line2), ''),
      btrim(p_barangay), btrim(p_city), btrim(p_province), nullif(btrim(p_postal_code), ''),
      private.make_location(p_latitude, p_longitude), p_is_default, null, 'MANUAL', '{}'
    ) returning * into result;
  else
    update public.addresses set
      label = btrim(p_label),
      line1 = btrim(p_line1),
      line2 = nullif(btrim(p_line2), ''),
      barangay = btrim(p_barangay),
      city = btrim(p_city),
      province = btrim(p_province),
      postal_code = nullif(btrim(p_postal_code), ''),
      location = private.make_location(p_latitude, p_longitude),
      is_default = p_is_default,
      archived_at = null,
      geocoding_provider = 'MANUAL',
      geocoding_provider_id = null,
      geocoding_confidence = null,
      geocoding_payload = '{}'
    where id = p_id and account_id = auth.uid()
    returning * into result;
    if result.id is null then
      raise exception using errcode = 'P0002', message = 'ADDRESS_NOT_FOUND';
    end if;
  end if;
  return result;
end $$;
create or replace function public.archive_my_address(p_address_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  update public.addresses set archived_at = now(), is_default = false
  where id = p_address_id and account_id = auth.uid() and archived_at is null
    and not exists (
      select 1 from public.service_requests request
      join public.bookings booking on booking.service_request_id = request.id
      where request.address_id = p_address_id
        and booking.status not in ('COMPLETED', 'CANCELLED')
    );
  get diagnostics changed = row_count;
  return changed = 1;
end $$;
revoke all on function public.upsert_my_address(uuid,text,text,text,text,text,text,text,numeric,numeric,boolean)
  from public, anon;
revoke all on function public.archive_my_address(uuid) from public, anon;
grant execute on function public.upsert_my_address(uuid,text,text,text,text,text,text,text,numeric,numeric,boolean)
  to authenticated;
grant execute on function public.archive_my_address(uuid) to authenticated;
