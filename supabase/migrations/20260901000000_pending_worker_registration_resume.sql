-- Server-side persistence for worker registrations that must survive the email
-- OTP flow. A mobile worker submitting their application before confirming the
-- account signs up, is routed to the OTP screen, and only after confirming does
-- the client resume the submission (uploads the ID documents and runs
-- submit_worker_application). If the app reloads between submit and OTP the
-- in-memory + AsyncStorage pending copy is lost, so the registration never
-- completes. This table keeps the full application payload (including base64
-- identity documents, since the verification-documents bucket only accepts
-- authenticated uploads) keyed by a client-generated random resume token, and
-- the resume step fetches it back by token.

begin;

create table if not exists public.pending_worker_registrations (
  resume_token text primary key,
  email text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists pending_worker_registrations_expires_idx
  on public.pending_worker_registrations(expires_at);

alter table public.pending_worker_registrations enable row level security;

-- Table rows are only ever reached through the security definer RPCs below
-- (save/get/clear by resume token), so no direct table policies are needed.

drop function if exists public.save_pending_worker_registration(text, text, jsonb);

create function public.save_pending_worker_registration(
  p_resume_token text,
  p_email text,
  p_payload jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_resume_token is null
    or btrim(p_resume_token) = ''
    or length(p_resume_token) > 128
  then
    raise exception using errcode = '22023', message = 'INVALID_RESUME_TOKEN';
  end if;

  if p_email is null or btrim(p_email) = '' then
    raise exception using errcode = '22023', message = 'INVALID_EMAIL';
  end if;

  if p_payload is null then
    raise exception using errcode = '22023', message = 'INVALID_PAYLOAD';
  end if;

  if octet_length(p_payload::text) > 6 * 1024 * 1024 then
    raise exception using errcode = '22023', message = 'PAYLOAD_TOO_LARGE';
  end if;

  insert into public.pending_worker_registrations(resume_token, email, payload, expires_at)
  values (btrim(p_resume_token), btrim(p_email), p_payload, now() + interval '48 hours')
  on conflict (resume_token)
  do update set email = excluded.email,
                payload = excluded.payload,
                expires_at = excluded.expires_at;
end $$;

drop function if exists public.get_pending_worker_registration(text);

create function public.get_pending_worker_registration(
  p_resume_token text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_resume_token is null or btrim(p_resume_token) = '' then
    return null;
  end if;

  delete from public.pending_worker_registrations
  where expires_at <= now();

  select payload
  into result
  from public.pending_worker_registrations
  where resume_token = btrim(p_resume_token)
    and expires_at > now();

  return result;
end $$;

drop function if exists public.clear_pending_worker_registration(text);

create function public.clear_pending_worker_registration(
  p_resume_token text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_resume_token is null or btrim(p_resume_token) = '' then
    return;
  end if;

  delete from public.pending_worker_registrations
  where resume_token = btrim(p_resume_token);
end $$;

revoke all on table public.pending_worker_registrations from anon, authenticated;

revoke all on function public.save_pending_worker_registration(text, text, jsonb) from public, anon;
grant execute on function public.save_pending_worker_registration(text, text, jsonb) to anon, authenticated;

revoke all on function public.get_pending_worker_registration(text) from public, anon;
grant execute on function public.get_pending_worker_registration(text) to anon, authenticated;

revoke all on function public.clear_pending_worker_registration(text) from public, anon;
grant execute on function public.clear_pending_worker_registration(text) to anon, authenticated;

commit;

notify pgrst, 'reload schema';
