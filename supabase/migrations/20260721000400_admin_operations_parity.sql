-- Administrative payout, verification-document, and session-history operations.

create table public.admin_session_history (
  id uuid primary key default gen_random_uuid(),
  admin_account_id uuid not null references public.admin_profiles(account_id) on delete cascade,
  session_id text not null,
  assurance_level text not null check (assurance_level in ('aal1','aal2')),
  user_agent text,
  signed_in_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  signed_out_at timestamptz,
  unique(admin_account_id, session_id)
);
alter table public.admin_session_history enable row level security;
revoke all on public.admin_session_history from anon, authenticated;
grant select on public.admin_session_history to authenticated;
create policy admin_session_history_self_read on public.admin_session_history for select to authenticated
using (admin_account_id = auth.uid() and public.is_admin(false));

create or replace function public.record_admin_session(p_user_agent text default null)
returns public.admin_session_history language plpgsql security definer set search_path = '' as $$
declare result public.admin_session_history; session_identifier text;
begin
  if not public.is_admin(false) then raise exception using errcode = '42501', message = 'Administrator required'; end if;
  session_identifier := coalesce(auth.jwt()->>'session_id', encode(extensions.digest(auth.jwt()::text, 'sha256'), 'hex'));
  insert into public.admin_session_history(admin_account_id, session_id, assurance_level, user_agent)
  values(auth.uid(), session_identifier, coalesce(auth.jwt()->>'aal','aal1'), left(p_user_agent, 500))
  on conflict(admin_account_id, session_id) do update set last_seen_at = now(),
    assurance_level = excluded.assurance_level, user_agent = coalesce(excluded.user_agent, public.admin_session_history.user_agent)
  returning * into result;
  return result;
end $$;

create or replace function public.close_admin_session()
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer; session_identifier text;
begin
  if not public.is_admin(false) then return false; end if;
  session_identifier := coalesce(auth.jwt()->>'session_id', encode(extensions.digest(auth.jwt()::text, 'sha256'), 'hex'));
  update public.admin_session_history set signed_out_at = coalesce(signed_out_at, now()), last_seen_at = now()
  where admin_account_id = auth.uid() and session_id = session_identifier;
  get diagnostics changed = row_count;
  return changed = 1;
end $$;

create or replace function public.review_verification_document(
  p_document_id uuid,
  p_decision text,
  p_notes text default null
)
returns public.worker_verification_documents language plpgsql security definer set search_path = '' as $$
declare document public.worker_verification_documents; result public.worker_verification_documents;
begin
  if not public.is_admin(true) or p_decision not in ('APPROVED','REJECTED','NEEDS_REPLACEMENT','EXPIRED') then
    raise exception using errcode = '42501', message = 'AAL2 administrator required';
  end if;
  select * into document from public.worker_verification_documents where id = p_document_id for update;
  if document.id is null or document.status <> 'PENDING' then raise exception using errcode = '55000', message = 'Document cannot be reviewed'; end if;
  update public.worker_verification_documents set status = p_decision, reviewer_id = auth.uid(),
    review_notes = nullif(trim(p_notes), ''), reviewed_at = now()
  where id = document.id returning * into result;
  if p_decision in ('REJECTED','NEEDS_REPLACEMENT','EXPIRED') then
    update public.worker_verifications set status = 'NEEDS_DOCUMENTS', requested_notes = coalesce(nullif(trim(p_notes), ''), 'A verification document must be replaced')
    where id = document.verification_id;
    update public.worker_profiles set approval_status = 'NEEDS_DOCUMENTS', is_available = false where account_id = document.worker_id;
  end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), 'VERIFICATION_DOCUMENT_REVIEWED', 'worker_verification_document', document.id::text,
    jsonb_build_object('decision', p_decision, 'notes', p_notes));
  return result;
end $$;

revoke all on function public.record_admin_session(text) from public, anon;
revoke all on function public.close_admin_session() from public, anon;
revoke all on function public.review_verification_document(uuid,text,text) from public, anon;
grant execute on function public.record_admin_session(text) to authenticated;
grant execute on function public.close_admin_session() to authenticated;
grant execute on function public.review_verification_document(uuid,text,text) to authenticated;
