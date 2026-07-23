begin;

-- The Edge Function accepts a photo or voice recording without requiring the
-- customer to duplicate that input in the text description. Keep the database
-- invariant aligned with that API contract while retaining the 4,000 character
-- upper bound for descriptions.
alter table public.ai_analysis_jobs
  drop constraint if exists ai_analysis_jobs_description_check;

alter table public.ai_analysis_jobs
  drop constraint if exists ai_analysis_jobs_description_or_media_check;

alter table public.ai_analysis_jobs
  add constraint ai_analysis_jobs_description_or_media_check check (
    length(description) <= 4000
    and (
      length(btrim(description)) >= 10
      or jsonb_array_length(media_paths) > 0
    )
  );

commit;
