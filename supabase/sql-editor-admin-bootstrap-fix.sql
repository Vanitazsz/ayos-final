-- A-YOS hosted-project patch: secure administrator bootstrap.
-- Apply once in the Supabase SQL Editor, then run `pnpm admin:bootstrap`.

begin;

-- Secure, one-time administrator bootstrap. FR-19, NFR-04, NFR-06.

create table if not exists private.admin_bootstrap_requests (
  email text primary key check (email = lower(btrim(email)) and length(email) between 3 and 254),
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  display_name text not null check (length(display_name) between 2 and 120),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at and expires_at <= created_at + interval '10 minutes')
);
revoke all on private.admin_bootstrap_requests from public, anon, authenticated, service_role;

create or replace function public.prepare_admin_bootstrap(
  email text,
  token_hash text,
  display_name text,
  expires_at timestamptz
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(btrim(email));
  normalized_name text := btrim(display_name);
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(normalized_email) > 254 then
    raise exception using errcode = '22023', message = 'INVALID_ADMIN_EMAIL';
  end if;
  if token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'INVALID_BOOTSTRAP_TOKEN_HASH';
  end if;
  if length(normalized_name) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'INVALID_ADMIN_DISPLAY_NAME';
  end if;
  if expires_at <= now() or expires_at > now() + interval '10 minutes' then
    raise exception using errcode = '22023', message = 'INVALID_BOOTSTRAP_EXPIRATION';
  end if;
  if exists(select 1 from auth.users where lower(auth.users.email) = normalized_email)
     or exists(select 1 from public.accounts where lower(accounts.email) = normalized_email) then
    raise exception using errcode = '23505', message = 'ADMIN_ACCOUNT_ALREADY_EXISTS';
  end if;

  insert into private.admin_bootstrap_requests(email, token_hash, display_name, expires_at)
  values(normalized_email, token_hash, normalized_name, expires_at)
  on conflict on constraint admin_bootstrap_requests_pkey do update
    set token_hash = excluded.token_hash,
        display_name = excluded.display_name,
        expires_at = excluded.expires_at,
        created_at = now();
end
$$;

create or replace function public.cancel_admin_bootstrap(email text, token_hash text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  delete from private.admin_bootstrap_requests request
  where request.email = lower(btrim($1))
    and request.token_hash = $2;
end
$$;

create or replace function public.admin_bootstrap_status(email text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when auth.role() = 'service_role' then jsonb_build_object(
    'auth_user_id', auth_user.id,
    'auth_user_exists', auth_user.id is not null,
    'account_exists', account.id is not null,
    'admin_profile_exists', admin_profile.account_id is not null,
    'app_role', auth_user.raw_app_meta_data->>'ayos_role',
    'account_is_admin', coalesce(account.role = 'ADMIN', false),
    'account_is_active', coalesce(account.status = 'ACTIVE' and account.deleted_at is null, false),
    'account_is_protected', coalesce(account.is_protected, false),
    'bootstrap_token_present', coalesce(auth_user.raw_user_meta_data->>'admin_bootstrap_token', '') <> '',
    'fully_bootstrapped', coalesce(
      account.role = 'ADMIN'
      and account.status = 'ACTIVE'
      and account.is_protected
      and account.deleted_at is null
      and admin_profile.account_id is not null
      and auth_user.raw_app_meta_data->>'ayos_role' = 'ADMIN',
      false
    ) and not (
      coalesce(auth_user.raw_user_meta_data->>'admin_bootstrap_token', '') <> ''
    )
  ) else null end
  from (select lower(btrim(email)) as normalized_email) input
  left join auth.users auth_user on lower(auth_user.email) = input.normalized_email
  left join public.accounts account on account.id = auth_user.id
  left join public.admin_profiles admin_profile on admin_profile.account_id = auth_user.id
$$;

create or replace function public.provision_account()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  requested_role public.account_role;
  display_name text;
  mobile_value text;
  bootstrap_token text;
  bootstrap_request private.admin_bootstrap_requests;
begin
  bootstrap_token := nullif(new.raw_user_meta_data->>'admin_bootstrap_token', '');
  if bootstrap_token is not null then
    delete from private.admin_bootstrap_requests request
    where request.email = lower(new.email)
      and request.token_hash = encode(extensions.digest(bootstrap_token, 'sha256'), 'hex')
      and request.expires_at > now()
    returning * into bootstrap_request;
  end if;

  if bootstrap_request.email is not null then
    requested_role := 'ADMIN';
    display_name := bootstrap_request.display_name;
  else
    begin
      requested_role := upper(coalesce(new.raw_user_meta_data->>'role', ''))::public.account_role;
    exception when invalid_text_representation then
      raise exception using errcode = '42501', message = 'Invalid account role';
    end;
    if requested_role = 'ADMIN' then
      raise exception using errcode = '42501', message = 'Administrator self-registration is prohibited';
    end if;
    if requested_role not in ('USER', 'WORKER') then
      raise exception using errcode = '42501', message = 'Invalid account role';
    end if;
    if not exists(
      select 1 from public.content_pages where key = 'TERMS' and published_at is not null
    ) then
      raise exception using errcode = 'P0001', message = 'Registration is unavailable until Terms are published';
    end if;
    display_name := btrim(coalesce(new.raw_user_meta_data->>'name', ''));
  end if;

  mobile_value := nullif(btrim(coalesce(new.raw_user_meta_data->>'mobile', '')), '');
  if length(display_name) < 2 then
    raise exception using errcode = '22023', message = 'A valid display name is required';
  end if;

  insert into public.accounts(id, role, status, email, mobile, is_protected)
  values(
    new.id,
    requested_role,
    case when requested_role = 'ADMIN' or new.email_confirmed_at is not null
      then 'ACTIVE'::public.account_status
      else 'PENDING_VERIFICATION'::public.account_status
    end,
    lower(new.email),
    mobile_value,
    requested_role = 'ADMIN'
  );
  if requested_role = 'USER' then
    insert into public.user_profiles(account_id, display_name) values(new.id, display_name);
  elsif requested_role = 'WORKER' then
    insert into public.worker_profiles(account_id, display_name) values(new.id, display_name);
  else
    insert into public.admin_profiles(account_id, display_name) values(new.id, display_name);
  end if;
  return new;
end
$$;

revoke execute on function public.prepare_admin_bootstrap(text,text,text,timestamptz),
  public.cancel_admin_bootstrap(text,text),
  public.admin_bootstrap_status(text) from public, anon, authenticated;
grant execute on function public.prepare_admin_bootstrap(text,text,text,timestamptz),
  public.cancel_admin_bootstrap(text,text),
  public.admin_bootstrap_status(text) to service_role;

commit;
