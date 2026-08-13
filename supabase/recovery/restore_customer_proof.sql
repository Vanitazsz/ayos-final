-- Recovery: restore customer proof-of-work photos into booking_proof_media.
--
-- When the customer review feature was removed, migration 20260814020000
-- dropped the `reviews` and `review_media` tables. Before that migration,
-- customer proof-of-work photos were uploaded into the private 'booking-proof'
-- Storage bucket, but their metadata rows lived in `review_media` (via
-- create_review + attach_review_media) rather than `booking_proof_media`. That
-- metadata is gone from production; the photo objects themselves were NOT
-- deleted and remain in the bucket.
--
-- To recover, restore the `reviews` and `review_media` tables from a backup
-- taken BEFORE 20260814020000 was applied (e.g. a PITR point or a weekly/daily
-- backup dump) into a temporary `_recovery` schema in the production database,
-- then run this script. It copies the metadata into `booking_proof_media` with
-- `submitted_by = 'customer'`, where the surviving RLS policies
-- (booking_proof_media_party_or_admin_read on the table and
-- booking_proof_party_or_admin_read on storage.objects) make them visible to
-- the booking's parties and admins again.
--
-- Restoring the two tables:
--   1. PITR-restore the pre-migration backup to a throwaway Supabase project
--      (or dump the backup with `pg_dump`).
--   2. Dump only those tables:
--        pg_dump --table=public.reviews      --data-only <backup-db>
--        pg_dump --table=public.review_media --data-only <backup-db>
--   3. In production, create the `_recovery` schema with the same table shapes
--      and load the dumps into it:
--        create schema if not exists _recovery;
--      (the two `create table _recovery.reviews / review_media` statements
--      below give you the column list needed)
--   4. Run this script in the Supabase SQL editor as postgres.
--
-- This script is idempotent: re-running it skips already-copied storage paths.

begin;

create schema if not exists _recovery;

-- Mirror of the pre-migration `reviews` table (subset of columns used here).
create table if not exists _recovery.reviews (
  id uuid primary key,
  booking_id uuid not null,
  worker_account_id uuid not null,
  created_at timestamptz not null default now()
);

-- Mirror of the pre-migration `review_media` table.
create table if not exists _recovery.review_media (
  id uuid primary key,
  review_id uuid not null,
  storage_path text not null,
  content_type text not null,
  byte_size integer not null
);

-- Copy customer proof metadata into booking_proof_media. Only rows whose photo
-- object still exists in the booking-proof bucket are restored, and only for
-- bookings that still exist. Constraints from booking_proof_media are honored:
--   worker_id -> worker_profiles(account_id)   (the booking's worker)
--   content_type in ('image/jpeg','image/png','image/webp')
--   byte_size between 1 and 15728640
insert into public.booking_proof_media (
  booking_id,
  worker_id,
  storage_path,
  content_type,
  byte_size,
  submitted_by
)
select
  review.booking_id,
  review.worker_account_id,
  media.storage_path,
  media.content_type,
  media.byte_size,
  'customer'
from _recovery.review_media media
join _recovery.reviews review on review.id = media.review_id
join public.bookings booking on booking.id = review.booking_id
join public.worker_profiles worker
  on worker.account_id = review.worker_account_id
where media.content_type in ('image/jpeg', 'image/png', 'image/webp')
  and media.byte_size between 1 and 15728640
  and exists (
    select 1
    from storage.objects object
    where object.bucket_id = 'booking-proof'
      and object.name = media.storage_path
  )
on conflict (storage_path) do nothing;

drop schema _recovery cascade;

commit;
