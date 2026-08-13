-- Account-owned AI rows (consents, analysis attempts, jobs, analyses) reference
-- public.accounts with ON DELETE RESTRICT. The hard-account-purge delete loop in
-- 20260730250000_safe_hard_account_purge.sql raises ACCOUNT_PURGE_DEPENDENCY_CYCLE
-- because these rows block the accounts-row delete. Cascade them off the account so
-- the purge (and native auth deletion) sweep them deterministically.
--
-- ai_analysis_jobs.consent_id is already ON DELETE SET NULL in production
-- (repo drift; the repo migration declares RESTRICT), so cascading consents does not
-- strand jobs. This migration is idempotent against both states.
begin;

alter table public.ai_processing_consents
  drop constraint if exists ai_processing_consents_account_id_fkey;
alter table public.ai_processing_consents
  add constraint ai_processing_consents_account_id_fkey
  foreign key (account_id) references public.accounts(id) on delete cascade;

alter table public.ai_analysis_attempts
  drop constraint if exists ai_analysis_attempts_account_id_fkey;
alter table public.ai_analysis_attempts
  add constraint ai_analysis_attempts_account_id_fkey
  foreign key (account_id) references public.accounts(id) on delete cascade;

alter table public.ai_analysis_jobs
  drop constraint if exists ai_analysis_jobs_account_id_fkey;
alter table public.ai_analysis_jobs
  add constraint ai_analysis_jobs_account_id_fkey
  foreign key (account_id) references public.accounts(id) on delete cascade;

alter table public.ai_analyses
  drop constraint if exists ai_analyses_account_id_fkey;
alter table public.ai_analyses
  add constraint ai_analyses_account_id_fkey
  foreign key (account_id) references public.accounts(id) on delete cascade;

commit;
