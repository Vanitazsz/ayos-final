begin;

-- Worker-to-customer feedback persistence.
-- Previously the submitted feedback lived only in AsyncStorage
-- (@worker_feedback_<bookingId>), so it was lost on app reinstall or
-- data clear. This migration gives the worker a server-side record so the
-- "Feedback Submitted" state survives reinstall, mirroring the existing
-- create_review RPC pattern for customer-to-worker reviews.

create table public.worker_feedback (
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

create index worker_feedback_worker_idx
  on public.worker_feedback(worker_account_id, created_at desc);

create trigger worker_feedback_set_updated_at
  before update on public.worker_feedback
  for each row execute function public.set_updated_at();

alter table public.worker_feedback enable row level security;
revoke all on public.worker_feedback from anon, authenticated;
grant select on public.worker_feedback to authenticated;

create policy worker_feedback_owner_or_admin_read
  on public.worker_feedback
  for select to authenticated
  using (worker_account_id = (select auth.uid()) or public.is_admin(false));

create or replace function public.submit_worker_feedback(
  p_booking_id uuid,
  p_rating integer,
  p_comment text,
  p_tags jsonb
) returns public.worker_feedback
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  result public.worker_feedback;
begin
  select *
  into booking
  from public.bookings
  where id = p_booking_id;
  if booking.id is null
    or booking.worker_account_id is distinct from auth.uid()
    or booking.status <> 'COMPLETED'
  then
    raise exception using errcode = '42501', message = 'WORKER_FEEDBACK_NOT_ALLOWED';
  end if;
  if p_rating not between 1 and 5 then
    raise exception using errcode = '22023', message = 'Invalid rating';
  end if;
  insert into public.worker_feedback(
    booking_id,
    worker_account_id,
    user_account_id,
    rating,
    comment,
    tags
  ) values (
    booking.id,
    booking.worker_account_id,
    booking.user_account_id,
    p_rating,
    coalesce(btrim(p_comment), ''),
    coalesce(p_tags, '[]'::jsonb)
  )
  on conflict (booking_id) do update
  set rating = excluded.rating,
      comment = excluded.comment,
      tags = excluded.tags
  returning * into result;
  return result;
end
$$;

revoke all on function public.submit_worker_feedback(uuid, integer, text, jsonb)
from public, anon;
grant execute on function public.submit_worker_feedback(uuid, integer, text, jsonb)
to authenticated;

notify pgrst, 'reload schema';

commit;
