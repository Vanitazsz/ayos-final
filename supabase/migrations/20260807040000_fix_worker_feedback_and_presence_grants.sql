begin;

-- Corrective migration: restore authenticated-role privileges on hosted.
-- Fixes PostgREST 42501 errors:
--   * "permission denied for table worker_feedback"  (getWorkerFeedback)
--   * "permission denied for function update_worker_presence"  (live dispatch)
-- Idempotent and self-healing: safe to run whether or not the objects exist.

-- 1. Worker feedback table (no-op if already present).
create table if not exists public.worker_feedback (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  worker_account_id uuid not null references public.worker_profiles(account_id) on delete restrict,
  user_account_id uuid not null references public.user_profiles(account_id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (length(comment) <= 5000),
  tags jsonb not null default '[]'::jsonb check (jsonb_typeof(tags) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists worker_feedback_worker_idx
  on public.worker_feedback(worker_account_id, created_at desc);

drop trigger if exists worker_feedback_set_updated_at on public.worker_feedback;
create trigger worker_feedback_set_updated_at
  before update on public.worker_feedback
  for each row execute function public.set_updated_at();

-- 2. RLS: worker (owner) or admin can read.
alter table public.worker_feedback enable row level security;

drop policy if exists worker_feedback_owner_or_admin_read on public.worker_feedback;
create policy worker_feedback_owner_or_admin_read
  on public.worker_feedback
  for select to authenticated
  using (worker_account_id = (select auth.uid()) or public.is_admin(false));

-- 3. Table grants: anon stays locked out, authenticated gets SELECT.
revoke all on public.worker_feedback from anon;
grant select on public.worker_feedback to authenticated;
grant select on public.worker_feedback to service_role;

-- 4. RPC execute grants (only if the functions exist).
do $$
begin
  if to_regprocedure('public.update_worker_presence(numeric,numeric,numeric,boolean)') is not null then
    execute 'grant execute on function public.update_worker_presence(numeric,numeric,numeric,boolean) to authenticated';
  end if;
  if to_regprocedure('public.submit_worker_feedback(uuid,integer,text,jsonb)') is not null then
    execute 'grant execute on function public.submit_worker_feedback(uuid,integer,text,jsonb) to authenticated';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
