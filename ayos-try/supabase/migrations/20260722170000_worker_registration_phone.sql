begin;

create or replace function public.provision_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role public.account_role;
  display_name text;
  mobile_value text;
  app_role text;
begin
  app_role := upper(coalesce(new.raw_app_meta_data->>'ayos_role', ''));
  requested_role := (
    case
      when app_role = 'ADMIN' then app_role
      else upper(coalesce(new.raw_user_meta_data->>'role', ''))
    end
  )::public.account_role;

  if requested_role not in ('USER', 'WORKER', 'ADMIN') then
    raise exception using errcode = '42501', message = 'Invalid account role';
  end if;
  if requested_role = 'ADMIN' and app_role <> 'ADMIN' then
    raise exception using errcode = '42501', message = 'Administrator self-registration is prohibited';
  end if;
  if requested_role <> 'ADMIN' and not exists (
    select 1
    from public.content_pages
    where key = 'TERMS' and published_at is not null
  ) then
    raise exception using errcode = 'P0001', message = 'Registration is unavailable until Terms are published';
  end if;

  display_name := trim(coalesce(new.raw_user_meta_data->>'name', ''));
  mobile_value := nullif(regexp_replace(trim(coalesce(new.raw_user_meta_data->>'mobile', '')), '[[:space:]]', '', 'g'), '');

  if mobile_value ~ '^09[0-9]{9}$' then
    mobile_value := '+63' || substr(mobile_value, 2);
  end if;
  if mobile_value is not null and mobile_value !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception using errcode = '22023', message = 'INVALID_MOBILE_NUMBER';
  end if;
  if length(display_name) < 2 then
    raise exception using errcode = '22023', message = 'A valid display name is required';
  end if;

  insert into public.accounts(id, role, status, email, mobile, is_protected)
  values (
    new.id,
    requested_role,
    case
      when requested_role = 'ADMIN' or new.email_confirmed_at is not null
        then 'ACTIVE'::public.account_status
      else 'PENDING_VERIFICATION'::public.account_status
    end,
    lower(new.email),
    mobile_value,
    requested_role = 'ADMIN'
  );

  if requested_role = 'USER' then
    insert into public.user_profiles(account_id, display_name)
    values (new.id, display_name);
  elsif requested_role = 'WORKER' then
    insert into public.worker_profiles(account_id, display_name)
    values (new.id, display_name);
  else
    insert into public.admin_profiles(account_id, display_name)
    values (new.id, display_name);
  end if;

  return new;
exception
  when invalid_text_representation then
    raise exception using errcode = '42501', message = 'Invalid account role';
end;
$$;

commit;
