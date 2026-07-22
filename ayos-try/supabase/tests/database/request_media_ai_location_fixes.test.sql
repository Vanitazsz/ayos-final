begin;

select plan(4);

select ok(
  (select allowed_mime_types @> array['audio/webm', 'audio/m4a', 'audio/wav']
   from storage.buckets where id = 'request-media'),
  'request-media accepts supported voice recording formats'
);

select is(
  (select count(*) from pg_indexes
   where schemaname = 'public'
     and indexname = 'request_media_request_path_unique'),
  1::bigint,
  'request media paths are idempotent per request'
);

select is(
  (select count(*) from pg_constraint
   where conrelid = 'public.ai_analysis_jobs'::regclass
     and conname = 'ai_analysis_jobs_description_or_media_check'),
  1::bigint,
  'AI jobs allow a description or media input'
);

select has_function(
  'public',
  'attach_request_media',
  array['uuid', 'text', 'text', 'integer'],
  'request media attachment RPC remains available'
);

select * from finish();
rollback;
