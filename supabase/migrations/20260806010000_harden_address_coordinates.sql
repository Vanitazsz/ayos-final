begin;

-- Harden coordinate storage against NaN / out-of-range values so the mobile
-- map camera can never receive garbage. MapLibre's native LatLng constructor
-- throws std::domain_error for NaN latitude, |latitude| > 90, NaN longitude or
-- infinite longitude; that exception escaped as an uncaught SIGABRT on the
-- app's matching screen.
--
-- Design notes:
--   * addresses.latitude/longitude are STORED GENERATED columns derived from
--     the `location` geography, so the fix must target `location` itself.
--   * Postgres `x NOT BETWEEN ...` evaluates to NULL for NaN, so NaN slipped
--     past private.make_location's range guard and could be stored in points.
--   * Dispatch never reads addresses.location (service_requests.service_location
--     is authoritative), so NULLing a degenerate point is safe for live
--     bookings; text fields and the geocoding payload remain untouched.

-- 1) Clear degenerate points on saved addresses that are not referenced by any
--    service request (the approved scope: never touch booking-related rows).
update public.addresses a
set location = null,
    updated_at = now()
where a.location is not null
  and (
    extensions.st_y(a.location::extensions.geometry) not between -90 and 90
    or extensions.st_x(a.location::extensions.geometry) not between -180 and 180
  )
  and not exists (
    select 1
    from public.service_requests sr
    where sr.address_id = a.id
  );

-- 2) Clear any remaining degenerate points (addresses referenced by requests).
--    Safe: the point is garbage on every axis (NaN / out-of-world) and is not
--    consumed by dispatch; NULL is the same "unknown location" the app already
--    tolerates for archived addresses. Required so the new CHECK can validate
--    the whole table.
update public.addresses a
set location = null,
    updated_at = now()
where a.location is not null
  and (
    extensions.st_y(a.location::extensions.geometry) not between -90 and 90
    or extensions.st_x(a.location::extensions.geometry) not between -180 and 180
  );

-- 3) Enforce the same predicate at the table level so garbage can never be
--    written again, even by paths that build points inline.
alter table public.addresses
  add constraint addresses_location_world_bounds
  check (
    location is null or (
      extensions.st_y(location::extensions.geometry) between -90 and 90
      and extensions.st_x(location::extensions.geometry) between -180 and 180
    )
  );

-- 4) Reject NaN explicitly in private.make_location (the single choke point for
--    every coordinate-writing RPC: addresses, worker origin, presence, matching).
--    `p_x::text = 'NaN'` catches both float8 and numeric NaN; the range guard
--    alone never fires because NaN comparisons are NULL.
create or replace function private.make_location(p_latitude numeric, p_longitude numeric)
returns extensions.geography
language plpgsql immutable set search_path = '' as $$
begin
  if p_latitude is null or p_longitude is null
    or p_latitude::text = 'NaN' or p_longitude::text = 'NaN'
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180 then
    raise exception using errcode='22023', message='INVALID_COORDINATES';
  end if;
  return extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography;
end $$;

-- 5) Surface a clean, user-facing error if a NaN somehow reaches the
--    customer-facing saved-address RPC (the PH bounds guard alone cannot catch
--    NaN, so add the explicit guard before it).
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
  if p_latitude::text = 'NaN' or p_longitude::text = 'NaN'
    or p_latitude not between 4.0 and 22.0
    or p_longitude not between 116.0 and 127.0 then
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

commit;
