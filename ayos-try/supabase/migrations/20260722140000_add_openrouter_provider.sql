-- Allow OPENROUTER as a valid AI provider in the processing consent check constraint
ALTER TABLE public.ai_processing_consents
  DROP CONSTRAINT IF EXISTS ai_processing_consents_providers_check;

ALTER TABLE public.ai_processing_consents
  ADD CONSTRAINT ai_processing_consents_providers_check
  CHECK (providers <@ array['OPENROUTER','GEMINI','OPENAI']::text[]);
