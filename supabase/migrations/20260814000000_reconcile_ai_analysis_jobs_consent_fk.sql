-- Reconcile ai_analysis_jobs.consent_id with production and remove a latent
-- purge blocker.
--
-- Production has the FK as ON DELETE SET NULL; the migration chain still
-- declares NOT NULL + ON DELETE RESTRICT (20260721010000, 20260722000200).
-- With consents now cascading off accounts (20260812000000), deleting an
-- account whose jobs reference a consent would SET NULL a NOT NULL column and
-- fail, re-introducing the purge failure. Making the column nullable and the FK
-- SET NULL (matching the sibling service_request_id / analysis_id columns)
-- keeps jobs intact while unlinked after consent removal. Idempotent against
-- both the live state and a fresh migration-chain state.
begin;

alter table public.ai_analysis_jobs
  alter column consent_id drop not null;

alter table public.ai_analysis_jobs
  drop constraint if exists ai_analysis_jobs_consent_id_fkey;
alter table public.ai_analysis_jobs
  add constraint ai_analysis_jobs_consent_id_fkey
  foreign key (consent_id) references public.ai_processing_consents(id) on delete set null;

notify pgrst, 'reload schema';
notify pgrst, 'reload config';

commit;
