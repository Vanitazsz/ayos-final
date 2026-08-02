-- Fix: Auto-publish reviews on creation so they appear on worker profiles.
-- Previously, create_review inserted reviews with default moderation_status='PENDING',
-- but all display queries filter for 'PUBLISHED', making reviews invisible.

CREATE OR REPLACE FUNCTION "public"."create_review"(
  "p_booking_id" "uuid",
  "stars" integer,
  "body" "text",
  "recommend_worker" boolean
) RETURNS "public"."reviews"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  booking public.bookings;
  result public.reviews;
begin
  select * into booking from public.bookings where id = p_booking_id;

  if booking.user_account_id is distinct from auth.uid()
     or booking.status <> 'COMPLETED'
     or not exists (
       select 1 from public.payments
       where booking_id = booking.id and status = 'SUCCESSFUL'
     )
  then
    raise exception using errcode = '42501', message = 'REVIEW_NOT_ALLOWED';
  end if;

  if stars not between 1 and 5
     or length(trim(body)) not between 3 and 4000
  then
    raise exception using errcode = '22023', message = 'Invalid review';
  end if;

  insert into public.reviews(
    booking_id, user_account_id, worker_account_id,
    stars, body, recommend_worker, moderation_status
  ) values (
    booking.id, booking.user_account_id, booking.worker_account_id,
    stars, trim(body), recommend_worker, 'PUBLISHED'
  ) returning * into result;

  return result;
end $$;

ALTER FUNCTION "public"."create_review"("p_booking_id" "uuid", "stars" integer, "body" "text", "recommend_worker" boolean) OWNER TO "postgres";
