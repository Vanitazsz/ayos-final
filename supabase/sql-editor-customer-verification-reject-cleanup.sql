-- A-YOS hosted-project cleanup: customer verifications that were rejected
-- before the 20260819010000 migration cleared no ID-document images. The
-- rejected rows still reference their uploaded documents, and the files still
-- sit in the verification-documents bucket.
--
-- This script:
--   1. lists every affected verification,
--   2. nulls the image URLs on those rows,
--   3. lists the storage objects that must be removed afterwards.
--
-- Raw SQL cannot delete the files themselves: storage.protect_delete()
-- rejects DELETE on storage.objects, and the Storage API is the supported
-- removal path. Remove the listed objects in the Storage Dashboard
-- (Storage -> verification-documents) or via the Storage API after this
-- transaction commits.
--
-- Apply once in the Supabase SQL Editor.

begin;

create temp table pending_cleanup_files on commit drop as
select obj.bucket_id, obj.name, obj.owner_id
from storage.objects obj
where obj.bucket_id = 'verification-documents'
  and obj.name in (
    select id_front_url from public.customer_verifications
    where status = 'rejected' and id_front_url is not null
    union all
    select id_back_url from public.customer_verifications
    where status = 'rejected' and id_back_url is not null
  );

select
  ver.id as verification_id,
  customer.email as customer_email,
  customer.raw_user_meta_data ->> 'name' as customer_name,
  ver.id_type,
  ver.id_front_url as front_path,
  ver.id_back_url as back_path
from public.customer_verifications ver
left join auth.users customer on customer.id = ver.customer_id
where ver.status = 'rejected'
  and (ver.id_front_url is not null or ver.id_back_url is not null)
order by customer.email, ver.created_at;

update public.customer_verifications
set id_front_url = null,
    id_back_url = null,
    updated_at = now()
where status = 'rejected'
  and (id_front_url is not null or id_back_url is not null);

select bucket_id, name, owner_id
from pending_cleanup_files
order by name;

commit;
