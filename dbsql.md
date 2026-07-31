-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.accounts (
  id uuid NOT NULL,
  role USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'ACTIVE'::account_status,
  email text NOT NULL UNIQUE CHECK (length(email) <= 254),
  mobile text UNIQUE CHECK (mobile IS NULL OR mobile ~ '^\+[1-9][0-9]{7,14}$'::text),
  is_protected boolean NOT NULL DEFAULT false,
  mfa_enabled boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  profile_completed_at timestamp with time zone,
  password_changed_at timestamp with time zone,
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_profiles (
  account_id uuid NOT NULL,
  display_name text NOT NULL CHECK (length(display_name) >= 2 AND length(display_name) <= 120),
  avatar_path text,
  notification_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  verification_status text NOT NULL DEFAULT 'unverified'::text CHECK (verification_status = ANY (ARRAY['unverified'::text, 'pending'::text, 'verified'::text, 'rejected'::text])),
  subdivision_id uuid,
  preferred_locale text NOT NULL DEFAULT 'en'::text CHECK (preferred_locale = ANY (ARRAY['en'::text, 'fil'::text])),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (account_id),
  CONSTRAINT user_profiles_subdivision_id_fkey FOREIGN KEY (subdivision_id) REFERENCES public.subdivisions(id),
  CONSTRAINT user_profiles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.worker_profiles (
  account_id uuid NOT NULL,
  display_name text NOT NULL CHECK (length(display_name) >= 2 AND length(display_name) <= 120),
  avatar_path text,
  bio text CHECK (length(bio) <= 2000),
  experience text CHECK (length(experience) <= 4000),
  service_area text CHECK (length(service_area) <= 255),
  approval_status USER-DEFINED NOT NULL DEFAULT 'PENDING'::worker_approval_status,
  recommendation_priority boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT false,
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  service_origin USER-DEFINED,
  service_radius_meters integer CHECK (service_radius_meters >= 100 AND service_radius_meters <= 200000),
  latitude numeric DEFAULT round((st_y((service_origin)::geometry))::numeric, 6),
  longitude numeric DEFAULT round((st_x((service_origin)::geometry))::numeric, 6),
  primary_industry_id uuid,
  subdivision_id uuid,
  preferred_locale text NOT NULL DEFAULT 'en'::text CHECK (preferred_locale = ANY (ARRAY['en'::text, 'fil'::text])),
  CONSTRAINT worker_profiles_pkey PRIMARY KEY (account_id),
  CONSTRAINT worker_profiles_subdivision_id_fkey FOREIGN KEY (subdivision_id) REFERENCES public.subdivisions(id),
  CONSTRAINT worker_profiles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT worker_profiles_primary_industry_id_fkey FOREIGN KEY (primary_industry_id) REFERENCES public.industries(id)
);
CREATE TABLE public.admin_profiles (
  account_id uuid NOT NULL,
  display_name text NOT NULL CHECK (length(display_name) >= 2 AND length(display_name) <= 120),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  given_name text CHECK (given_name IS NULL OR length(given_name) >= 1 AND length(given_name) <= 80),
  family_name text CHECK (family_name IS NULL OR length(family_name) >= 1 AND length(family_name) <= 80),
  location text CHECK (location IS NULL OR length(location) <= 255),
  bio text CHECK (bio IS NULL OR length(bio) <= 2000),
  avatar_path text,
  CONSTRAINT admin_profiles_pkey PRIMARY KEY (account_id),
  CONSTRAINT admin_profiles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.worker_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL UNIQUE,
  status USER-DEFINED NOT NULL DEFAULT 'PENDING'::worker_approval_status,
  identity_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  document_paths ARRAY NOT NULL DEFAULT '{}'::text[],
  requested_notes text CHECK (length(requested_notes) <= 2000),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT worker_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT worker_verifications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.accounts(id),
  CONSTRAINT worker_verifications_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(account_id)
);
CREATE TABLE public.worker_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Manila'::text,
  CONSTRAINT worker_availability_pkey PRIMARY KEY (id),
  CONSTRAINT worker_availability_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(account_id)
);
CREATE TABLE public.service_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (length(name) >= 2 AND length(name) <= 120),
  description text CHECK (length(description) <= 1000),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  slug text,
  minimum_price_minor bigint,
  maximum_price_minor bigint,
  is_safety_critical boolean NOT NULL DEFAULT false,
  industry_id uuid,
  CONSTRAINT service_categories_pkey PRIMARY KEY (id),
  CONSTRAINT service_categories_industry_id_fkey FOREIGN KEY (industry_id) REFERENCES public.industries(id)
);
CREATE TABLE public.worker_skills (
  worker_id uuid NOT NULL,
  category_id uuid NOT NULL,
  years integer NOT NULL DEFAULT 0 CHECK (years >= 0 AND years <= 80),
  rate_minor bigint CHECK (rate_minor IS NULL OR rate_minor >= 100),
  CONSTRAINT worker_skills_pkey PRIMARY KEY (worker_id, category_id),
  CONSTRAINT worker_skills_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(account_id),
  CONSTRAINT worker_skills_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(id)
);
CREATE TABLE public.addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  label text NOT NULL CHECK (length(label) >= 1 AND length(label) <= 80),
  line1 text NOT NULL CHECK (length(line1) <= 255),
  line2 text CHECK (length(line2) <= 255),
  barangay text NOT NULL CHECK (length(barangay) <= 120),
  city text NOT NULL CHECK (length(city) <= 120),
  province text NOT NULL CHECK (length(province) <= 120),
  postal_code text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  location USER-DEFINED,
  latitude numeric DEFAULT round((st_y((location)::geometry))::numeric, 6),
  longitude numeric DEFAULT round((st_x((location)::geometry))::numeric, 6),
  recipient_name text CHECK (recipient_name IS NULL OR length(recipient_name) >= 2 AND length(recipient_name) <= 120),
  contact_mobile text CHECK (contact_mobile IS NULL OR contact_mobile ~ '^\+[1-9][0-9]{7,14}$'::text),
  instructions text CHECK (instructions IS NULL OR length(instructions) <= 1000),
  archived_at timestamp with time zone,
  geocoding_provider text,
  geocoding_provider_id text,
  geocoding_confidence numeric CHECK (geocoding_confidence IS NULL OR geocoding_confidence >= 0::numeric AND geocoding_confidence <= 1::numeric),
  geocoding_payload jsonb,
  CONSTRAINT addresses_pkey PRIMARY KEY (id),
  CONSTRAINT addresses_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.ai_analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  input_type text NOT NULL CHECK (input_type = ANY (ARRAY['IMAGE'::text, 'VOICE'::text, 'TEXT'::text])),
  input_storage_path text,
  transcript text,
  detected_issue text,
  severity text,
  possible_cause text,
  suggested_category_name text,
  estimated_cost_minimum numeric,
  estimated_cost_maximum numeric,
  safety_advice text,
  provider text NOT NULL,
  provider_reference text,
  saved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  provider_model text,
  idempotency_key text CHECK (idempotency_key IS NULL OR length(idempotency_key) >= 16 AND length(idempotency_key) <= 128),
  request_draft text,
  CONSTRAINT ai_analyses_pkey PRIMARY KEY (id),
  CONSTRAINT ai_analyses_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.service_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_account_id uuid NOT NULL,
  category_id uuid NOT NULL,
  address_id uuid NOT NULL,
  ai_analysis_id uuid UNIQUE,
  status USER-DEFINED NOT NULL DEFAULT 'DRAFT'::request_status,
  description text NOT NULL CHECK (length(description) >= 10 AND length(description) <= 4000),
  scheduled_at timestamp with time zone NOT NULL,
  budget numeric NOT NULL CHECK (budget > 0::numeric),
  notes text CHECK (length(notes) <= 2000),
  notify_on_match boolean NOT NULL DEFAULT false,
  selected_worker_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  service_location USER-DEFINED NOT NULL,
  subdivision_id uuid,
  address_snapshot jsonb,
  CONSTRAINT service_requests_pkey PRIMARY KEY (id),
  CONSTRAINT service_requests_ai_analysis_id_fkey FOREIGN KEY (ai_analysis_id) REFERENCES public.ai_analyses(id),
  CONSTRAINT service_requests_subdivision_id_fkey FOREIGN KEY (subdivision_id) REFERENCES public.subdivisions(id),
  CONSTRAINT service_requests_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id),
  CONSTRAINT service_requests_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(id),
  CONSTRAINT service_requests_selected_worker_id_fkey FOREIGN KEY (selected_worker_id) REFERENCES public.worker_profiles(account_id),
  CONSTRAINT service_requests_user_account_id_fkey FOREIGN KEY (user_account_id) REFERENCES public.user_profiles(account_id)
);
CREATE TABLE public.request_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL,
  storage_path text NOT NULL,
  content_type text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size > 0 AND byte_size <= 15728640),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT request_media_pkey PRIMARY KEY (id),
  CONSTRAINT request_media_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id)
);
CREATE TABLE public.match_candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  score numeric NOT NULL,
  rank integer NOT NULL CHECK (rank > 0),
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  eligible boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT match_candidates_pkey PRIMARY KEY (id),
  CONSTRAINT match_candidates_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id),
  CONSTRAINT match_candidates_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(account_id)
);
CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL,
  user_account_id uuid NOT NULL,
  worker_account_id uuid NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'PENDING'::booking_status,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  response_due_at timestamp with time zone NOT NULL DEFAULT (now() + '00:15:00'::interval),
  accepted_at timestamp with time zone,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  agreed_service_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'PHP'::text CHECK (currency = 'PHP'::text),
  worker_start_lat double precision,
  worker_start_lng double precision,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id),
  CONSTRAINT bookings_user_account_id_fkey FOREIGN KEY (user_account_id) REFERENCES public.user_profiles(account_id),
  CONSTRAINT bookings_worker_account_id_fkey FOREIGN KEY (worker_account_id) REFERENCES public.worker_profiles(account_id)
);
CREATE TABLE public.booking_status_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  from_status USER-DEFINED,
  to_status USER-DEFINED NOT NULL,
  actor_id uuid,
  reason text CHECK (length(reason) <= 1000),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT booking_status_events_pkey PRIMARY KEY (id),
  CONSTRAINT booking_status_events_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT booking_status_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.cancellations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE,
  cancelled_by uuid NOT NULL,
  reason text NOT NULL CHECK (length(reason) >= 3 AND length(reason) <= 1000),
  policy_version text NOT NULL,
  confirmed_at timestamp with time zone NOT NULL DEFAULT now(),
  reason_code text CHECK (reason_code IS NULL OR reason_code ~ '^[A-Z][A-Z0-9_]{2,79}$'::text),
  initiator_role USER-DEFINED,
  job_stage text CHECK (job_stage IS NULL OR (job_stage = ANY (ARRAY['BEFORE_ACCEPTANCE'::text, 'BEFORE_TRAVEL'::text, 'TRAVELLING'::text, 'EN_ROUTE'::text, 'ARRIVED'::text, 'SERVICE_STARTED'::text, 'IN_PROGRESS'::text]))),
  fee_amount numeric NOT NULL DEFAULT 0 CHECK (fee_amount >= 0::numeric),
  refund_amount numeric NOT NULL DEFAULT 0 CHECK (refund_amount >= 0::numeric),
  resolution_status text NOT NULL DEFAULT 'CONFIRMED'::text CHECK (resolution_status = ANY (ARRAY['PENDING'::text, 'CONFIRMED'::text, 'DISPUTED'::text, 'RESOLVED'::text])),
  CONSTRAINT cancellations_pkey PRIMARY KEY (id),
  CONSTRAINT cancellations_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT cancellations_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.accounts(id)
);
CREATE TABLE public.location_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  account_id uuid NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  location USER-DEFINED NOT NULL,
  latitude numeric DEFAULT round((st_y((location)::geometry))::numeric, 6),
  longitude numeric DEFAULT round((st_x((location)::geometry))::numeric, 6),
  CONSTRAINT location_updates_pkey PRIMARY KEY (id),
  CONSTRAINT location_updates_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT location_updates_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE,
  method USER-DEFINED NOT NULL CHECK (method = 'CASH'::payment_method),
  status USER-DEFINED NOT NULL DEFAULT 'AWAITING_CONFIRMATIONS'::payment_status,
  service_amount numeric NOT NULL CHECK (service_amount > 0::numeric),
  commission_rate numeric NOT NULL DEFAULT 0.1000 CHECK (commission_rate >= 0::numeric AND commission_rate <= 1::numeric),
  commission_amount numeric NOT NULL,
  worker_net_amount numeric NOT NULL,
  homeowner_platform_charge numeric NOT NULL DEFAULT 0,
  idempotency_key text NOT NULL UNIQUE CHECK (length(idempotency_key) >= 16 AND length(idempotency_key) <= 128),
  failure_reason text,
  successful_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  currency text NOT NULL DEFAULT 'PHP'::text CHECK (currency = 'PHP'::text),
  provider text CHECK (provider IS NULL OR provider = 'PAYMONGO'::text),
  provider_payment_id text,
  paid_at timestamp with time zone,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);
CREATE TABLE public.cash_confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL,
  account_id uuid NOT NULL,
  party USER-DEFINED NOT NULL,
  confirmed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cash_confirmations_pkey PRIMARY KEY (id),
  CONSTRAINT cash_confirmations_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id),
  CONSTRAINT cash_confirmations_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL UNIQUE,
  receipt_number text NOT NULL UNIQUE,
  service_amount numeric NOT NULL,
  commission_rate numeric NOT NULL,
  commission_amount numeric NOT NULL,
  worker_net_amount numeric NOT NULL,
  homeowner_platform_charge numeric NOT NULL,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT receipts_pkey PRIMARY KEY (id),
  CONSTRAINT receipts_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id)
);
CREATE TABLE public.refunds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL UNIQUE,
  status USER-DEFINED NOT NULL DEFAULT 'PENDING'::refund_status,
  reason text NOT NULL CHECK (length(reason) >= 3 AND length(reason) <= 1000),
  decided_by uuid,
  decided_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT refunds_pkey PRIMARY KEY (id),
  CONSTRAINT refunds_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.accounts(id),
  CONSTRAINT refunds_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE,
  user_account_id uuid NOT NULL,
  worker_account_id uuid NOT NULL,
  stars smallint NOT NULL CHECK (stars >= 1 AND stars <= 5),
  body text NOT NULL CHECK (length(body) >= 3 AND length(body) <= 4000),
  recommend_worker boolean NOT NULL,
  moderation_status USER-DEFINED NOT NULL DEFAULT 'PENDING'::review_moderation_status,
  moderated_by uuid,
  moderated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_moderated_by_fkey FOREIGN KEY (moderated_by) REFERENCES public.accounts(id),
  CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT reviews_user_account_id_fkey FOREIGN KEY (user_account_id) REFERENCES public.user_profiles(account_id),
  CONSTRAINT reviews_worker_account_id_fkey FOREIGN KEY (worker_account_id) REFERENCES public.worker_profiles(account_id)
);
CREATE TABLE public.review_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  storage_path text NOT NULL,
  content_type text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size > 0 AND byte_size <= 15728640),
  CONSTRAINT review_media_pkey PRIMARY KEY (id),
  CONSTRAINT review_media_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid UNIQUE,
  service_request_id uuid,
  worker_account_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  archived_at timestamp with time zone,
  archived_by uuid,
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES public.accounts(id),
  CONSTRAINT conversations_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT conversations_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id),
  CONSTRAINT conversations_worker_account_id_fkey FOREIGN KEY (worker_account_id) REFERENCES public.worker_profiles(account_id)
);
CREATE TABLE public.conversation_participants (
  conversation_id uuid NOT NULL,
  account_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  last_read_at timestamp with time zone,
  CONSTRAINT conversation_participants_pkey PRIMARY KEY (conversation_id, account_id),
  CONSTRAINT conversation_participants_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  body text CHECK (length(body) <= 4000),
  original_locale text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.message_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind = ANY (ARRAY['IMAGE'::text, 'LOCATION'::text, 'VOICE'::text])),
  storage_path text,
  location jsonb,
  content_type text,
  byte_size integer CHECK (byte_size IS NULL OR byte_size >= 1 AND byte_size <= 15728640),
  CONSTRAINT message_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id)
);
CREATE TABLE public.message_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  target_locale text NOT NULL,
  translated text NOT NULL,
  provider text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT message_translations_pkey PRIMARY KEY (id),
  CONSTRAINT message_translations_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_id uuid,
  audience USER-DEFINED,
  title text NOT NULL CHECK (length(title) >= 1 AND length(title) <= 160),
  body text NOT NULL,
  category text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'DRAFT'::notification_status,
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  source_key text UNIQUE,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  booking_id uuid,
  subject text NOT NULL CHECK (length(subject) >= 3 AND length(subject) <= 200),
  description text NOT NULL CHECK (length(description) >= 10 AND length(description) <= 4000),
  status USER-DEFINED NOT NULL DEFAULT 'OPEN'::ticket_status,
  resolution text,
  escalated_at timestamp with time zone,
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  category text CHECK (category IS NULL OR length(category) >= 2 AND length(category) <= 80),
  priority text CHECK (priority IS NULL OR (priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'URGENT'::text]))),
  assigned_to uuid,
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.accounts(id),
  CONSTRAINT support_tickets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.content_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key USER-DEFINED NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL,
  version text NOT NULL,
  published_at timestamp with time zone,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT content_pages_pkey PRIMARY KEY (id),
  CONSTRAINT content_pages_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.accounts(id)
);
CREATE TABLE public.system_settings (
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_settings_pkey PRIMARY KEY (key),
  CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.accounts(id)
);
CREATE TABLE public.trash_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  snapshot jsonb NOT NULL,
  deleted_by uuid NOT NULL,
  deleted_at timestamp with time zone NOT NULL DEFAULT now(),
  restored_at timestamp with time zone,
  restored_by uuid,
  CONSTRAINT trash_entries_pkey PRIMARY KEY (id),
  CONSTRAINT trash_entries_restored_by_fkey FOREIGN KEY (restored_by) REFERENCES public.accounts(id),
  CONSTRAINT trash_entries_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.accounts(id)
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  correlation_id text NOT NULL DEFAULT (gen_random_uuid())::text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.report_exports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  storage_path text,
  status text NOT NULL CHECK (status = ANY (ARRAY['QUEUED'::text, 'PROCESSING'::text, 'COMPLETED'::text, 'FAILED'::text])),
  requested_by uuid NOT NULL,
  failure_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT report_exports_pkey PRIMARY KEY (id),
  CONSTRAINT report_exports_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.accounts(id)
);
CREATE TABLE public.favorites (
  user_account_id uuid NOT NULL,
  worker_account_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT favorites_pkey PRIMARY KEY (user_account_id, worker_account_id),
  CONSTRAINT favorites_user_account_id_fkey FOREIGN KEY (user_account_id) REFERENCES public.user_profiles(account_id),
  CONSTRAINT favorites_worker_account_id_fkey FOREIGN KEY (worker_account_id) REFERENCES public.worker_profiles(account_id)
);
CREATE TABLE public.job_failures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  queue_name text NOT NULL,
  message_id bigint,
  payload jsonb NOT NULL,
  attempts integer NOT NULL,
  error text NOT NULL,
  failed_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid,
  CONSTRAINT job_failures_pkey PRIMARY KEY (id),
  CONSTRAINT job_failures_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.accounts(id)
);
CREATE TABLE public.ai_analysis_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  analysis_id uuid,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) >= 16 AND length(idempotency_key) <= 128),
  provider text NOT NULL CHECK (provider = ANY (ARRAY['OPENAI'::text, 'GEMINI'::text, 'OPENROUTER'::text])),
  model text NOT NULL,
  outcome text NOT NULL CHECK (outcome = ANY (ARRAY['SUCCEEDED'::text, 'FAILED'::text, 'SKIPPED'::text])),
  retryable boolean NOT NULL,
  latency_ms integer NOT NULL CHECK (latency_ms >= 0),
  error_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  job_id uuid,
  correlation_id text,
  usage_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  http_status integer,
  CONSTRAINT ai_analysis_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT ai_analysis_attempts_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.ai_analyses(id),
  CONSTRAINT ai_analysis_attempts_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.ai_analysis_jobs(id),
  CONSTRAINT ai_analysis_attempts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.account_role_memberships (
  account_id uuid NOT NULL,
  role USER-DEFINED NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'REVOKED'::text])),
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone,
  CONSTRAINT account_role_memberships_pkey PRIMARY KEY (account_id, role),
  CONSTRAINT account_role_memberships_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.account_session_roles (
  session_id text NOT NULL,
  account_id uuid NOT NULL,
  active_role USER-DEFINED NOT NULL CHECK (active_role <> 'ADMIN'::account_role),
  switched_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT account_session_roles_pkey PRIMARY KEY (session_id),
  CONSTRAINT account_session_roles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.industries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text),
  name text NOT NULL UNIQUE CHECK (length(name) >= 2 AND length(name) <= 120),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  CONSTRAINT industries_pkey PRIMARY KEY (id)
);
CREATE TABLE public.skills (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  industry_id uuid NOT NULL,
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text),
  name text NOT NULL CHECK (length(name) >= 2 AND length(name) <= 120),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT skills_pkey PRIMARY KEY (id),
  CONSTRAINT skills_industry_id_fkey FOREIGN KEY (industry_id) REFERENCES public.industries(id)
);
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  industry_id uuid,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text),
  name text NOT NULL CHECK (length(name) >= 2 AND length(name) <= 160),
  description text,
  minimum_price_minor bigint NOT NULL DEFAULT 0 CHECK (minimum_price_minor >= 0),
  maximum_price_minor bigint,
  estimated_duration_minutes integer CHECK (estimated_duration_minutes >= 5 AND estimated_duration_minutes <= 10080),
  is_safety_critical boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT services_pkey PRIMARY KEY (id),
  CONSTRAINT services_industry_id_fkey FOREIGN KEY (industry_id) REFERENCES public.industries(id),
  CONSTRAINT services_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(id)
);
CREATE TABLE public.worker_offerings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  service_id uuid NOT NULL,
  price_minor bigint CHECK (price_minor IS NULL OR price_minor >= 0),
  description text CHECK (description IS NULL OR length(description) <= 2000),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT worker_offerings_pkey PRIMARY KEY (id),
  CONSTRAINT worker_offerings_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(account_id),
  CONSTRAINT worker_offerings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.request_bids (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  message text CHECK (message IS NULL OR length(message) <= 2000),
  estimated_duration_minutes integer CHECK (estimated_duration_minutes >= 5 AND estimated_duration_minutes <= 10080),
  status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'WITHDRAWN'::text, 'ACCEPTED'::text, 'REJECTED'::text, 'EXPIRED'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT request_bids_pkey PRIMARY KEY (id),
  CONSTRAINT request_bids_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id),
  CONSTRAINT request_bids_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(account_id)
);
CREATE TABLE public.wallets (
  account_id uuid NOT NULL,
  currency text NOT NULL DEFAULT 'PHP'::text CHECK (currency = 'PHP'::text),
  available_minor bigint NOT NULL DEFAULT 0 CHECK (available_minor >= 0),
  locked_minor bigint NOT NULL DEFAULT 0 CHECK (locked_minor >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wallets_pkey PRIMARY KEY (account_id),
  CONSTRAINT wallets_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wallet_account_id uuid NOT NULL,
  booking_id uuid,
  payout_request_id uuid,
  transaction_type text NOT NULL CHECK (transaction_type = ANY (ARRAY['BOOKING_EARNING'::text, 'PAYOUT_HOLD'::text, 'PAYOUT_RELEASE'::text, 'PAYOUT_COMPLETED'::text, 'ADJUSTMENT'::text])),
  amount_minor bigint NOT NULL CHECK (amount_minor <> 0),
  balance_after_minor bigint NOT NULL CHECK (balance_after_minor >= 0),
  idempotency_key text NOT NULL UNIQUE CHECK (length(idempotency_key) >= 16 AND length(idempotency_key) <= 160),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT wallet_transactions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT wallet_transactions_payout_request_id_fkey FOREIGN KEY (payout_request_id) REFERENCES public.payout_requests(id),
  CONSTRAINT wallet_transactions_wallet_account_id_fkey FOREIGN KEY (wallet_account_id) REFERENCES public.wallets(account_id)
);
CREATE TABLE public.payout_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  method_type text NOT NULL CHECK (method_type = ANY (ARRAY['BANK'::text, 'GCASH'::text, 'MAYA'::text])),
  label text NOT NULL CHECK (length(label) >= 2 AND length(label) <= 120),
  details_encrypted text NOT NULL,
  last_four text CHECK (last_four IS NULL OR last_four ~ '^[0-9]{4}$'::text),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payout_methods_pkey PRIMARY KEY (id),
  CONSTRAINT payout_methods_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.payout_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  payout_method_id uuid NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  status text NOT NULL DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'PROCESSING'::text, 'PAID'::text, 'REJECTED'::text, 'CANCELLED'::text])),
  idempotency_key text NOT NULL UNIQUE CHECK (length(idempotency_key) >= 16 AND length(idempotency_key) <= 160),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  failure_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payout_requests_pkey PRIMARY KEY (id),
  CONSTRAINT payout_requests_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT payout_requests_payout_method_id_fkey FOREIGN KEY (payout_method_id) REFERENCES public.payout_methods(id),
  CONSTRAINT payout_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.accounts(id)
);
CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) >= 1 AND length(body) <= 4000),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT support_messages_pkey PRIMARY KEY (id),
  CONSTRAINT support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id),
  CONSTRAINT support_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.support_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  support_message_id uuid NOT NULL,
  storage_path text NOT NULL,
  content_type text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size >= 1 AND byte_size <= 15728640),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT support_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT support_attachments_support_message_id_fkey FOREIGN KEY (support_message_id) REFERENCES public.support_messages(id)
);
CREATE TABLE public.review_votes (
  review_id uuid NOT NULL,
  account_id uuid NOT NULL,
  helpful boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT review_votes_pkey PRIMARY KEY (review_id, account_id),
  CONSTRAINT review_votes_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT review_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id)
);
CREATE TABLE public.review_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  reporter_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(reason) >= 3 AND length(reason) <= 1000),
  status text NOT NULL DEFAULT 'OPEN'::text CHECK (status = ANY (ARRAY['OPEN'::text, 'DISMISSED'::text, 'ACTIONED'::text])),
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT review_reports_pkey PRIMARY KEY (id),
  CONSTRAINT review_reports_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id),
  CONSTRAINT review_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.accounts(id),
  CONSTRAINT review_reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.accounts(id)
);
CREATE TABLE public.review_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) >= 1 AND length(body) <= 2000),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT review_replies_pkey PRIMARY KEY (id),
  CONSTRAINT review_replies_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id),
  CONSTRAINT review_replies_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.review_ai_insights (
  review_id uuid NOT NULL,
  sentiment text NOT NULL CHECK (sentiment = ANY (ARRAY['POSITIVE'::text, 'NEUTRAL'::text, 'NEGATIVE'::text, 'MIXED'::text])),
  topics ARRAY NOT NULL DEFAULT '{}'::text[],
  risk_flags ARRAY NOT NULL DEFAULT '{}'::text[],
  confidence numeric NOT NULL CHECK (confidence >= 0::numeric AND confidence <= 1::numeric),
  provider text NOT NULL,
  model text NOT NULL,
  provider_reference text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT review_ai_insights_pkey PRIMARY KEY (review_id),
  CONSTRAINT review_ai_insights_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id)
);
CREATE TABLE public.notification_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) >= 1 AND length(title) <= 160),
  body text NOT NULL CHECK (length(body) >= 1 AND length(body) <= 4000),
  audience USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'DRAFT'::notification_status,
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notification_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT notification_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.accounts(id)
);
CREATE TABLE public.notification_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  notification_id uuid,
  channel text NOT NULL DEFAULT 'IN_APP'::text CHECK (channel = 'IN_APP'::text),
  status text NOT NULL DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'DELIVERED'::text, 'READ'::text, 'FAILED'::text])),
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  error_code text,
  CONSTRAINT notification_deliveries_pkey PRIMARY KEY (id),
  CONSTRAINT notification_deliveries_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id),
  CONSTRAINT notification_deliveries_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.notification_campaigns(id),
  CONSTRAINT notification_deliveries_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.cancellation_reasons (
  code text NOT NULL CHECK (code ~ '^[A-Z0-9_]+$'::text),
  label text NOT NULL,
  applies_to text NOT NULL CHECK (applies_to = ANY (ARRAY['USER'::text, 'WORKER'::text, 'BOTH'::text])),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT cancellation_reasons_pkey PRIMARY KEY (code)
);
CREATE TABLE public.ai_processing_consents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  consent_version text NOT NULL,
  providers ARRAY NOT NULL CHECK (providers <@ ARRAY['OPENROUTER'::text, 'GEMINI'::text, 'OPENAI'::text]),
  media_processing boolean NOT NULL DEFAULT false,
  accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone,
  request_correlation_id text NOT NULL,
  CONSTRAINT ai_processing_consents_pkey PRIMARY KEY (id),
  CONSTRAINT ai_processing_consents_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.ai_analysis_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  consent_id uuid NOT NULL,
  service_request_id uuid,
  analysis_id uuid,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) >= 16 AND length(idempotency_key) <= 128),
  status text NOT NULL DEFAULT 'QUEUED'::text CHECK (status = ANY (ARRAY['QUEUED'::text, 'PROCESSING'::text, 'SUCCEEDED'::text, 'FAILED'::text, 'CANCELLED'::text])),
  description text NOT NULL,
  media_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  input_locale text,
  result jsonb,
  error_code text,
  error_message text,
  retryable boolean NOT NULL DEFAULT false,
  correlation_id text NOT NULL DEFAULT (gen_random_uuid())::text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_analysis_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT ai_analysis_jobs_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id),
  CONSTRAINT ai_analysis_jobs_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.ai_analyses(id),
  CONSTRAINT ai_analysis_jobs_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT ai_analysis_jobs_consent_id_fkey FOREIGN KEY (consent_id) REFERENCES public.ai_processing_consents(id)
);
CREATE TABLE public.geocoding_cache (
  cache_key text NOT NULL,
  operation text NOT NULL CHECK (operation = ANY (ARRAY['SEARCH'::text, 'REVERSE'::text, 'ROUTE'::text])),
  normalized_request jsonb NOT NULL,
  normalized_response jsonb NOT NULL,
  provider text NOT NULL DEFAULT 'OPENROUTESERVICE'::text,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT geocoding_cache_pkey PRIMARY KEY (cache_key)
);
CREATE TABLE public.route_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  route_geojson jsonb NOT NULL,
  distance_meters integer NOT NULL CHECK (distance_meters >= 0),
  duration_seconds integer NOT NULL CHECK (duration_seconds >= 0),
  worker_location USER-DEFINED NOT NULL,
  destination USER-DEFINED NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT route_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT route_snapshots_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT route_snapshots_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.accounts(id)
);
CREATE TABLE public.authentication_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['SIGNED_IN'::text, 'SIGNED_OUT'::text, 'PASSWORD_CHANGED'::text, 'MFA_CHANGED'::text])),
  session_id_hash text,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT authentication_events_pkey PRIMARY KEY (id),
  CONSTRAINT authentication_events_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.conversation_reads (
  conversation_id uuid NOT NULL,
  account_id uuid NOT NULL,
  last_read_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT conversation_reads_pkey PRIMARY KEY (conversation_id, account_id),
  CONSTRAINT conversation_reads_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT conversation_reads_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.worker_portfolio_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  storage_path text NOT NULL UNIQUE,
  caption text CHECK (caption IS NULL OR length(caption) <= 300),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0 AND sort_order <= 1000),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT worker_portfolio_media_pkey PRIMARY KEY (id),
  CONSTRAINT worker_portfolio_media_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(account_id)
);
CREATE TABLE public.worker_portfolio_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  category_id uuid,
  title text NOT NULL CHECK (length(title) >= 2 AND length(title) <= 120),
  description text NOT NULL CHECK (length(description) >= 3 AND length(description) <= 2000),
  completed_on date,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT worker_portfolio_items_pkey PRIMARY KEY (id),
  CONSTRAINT worker_portfolio_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(id),
  CONSTRAINT worker_portfolio_items_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(account_id)
);
CREATE TABLE public.service_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  name text NOT NULL CHECK (length(TRIM(BOTH FROM name)) >= 2 AND length(TRIM(BOTH FROM name)) <= 160),
  description text CHECK (description IS NULL OR length(description) <= 2000),
  base_price numeric NOT NULL CHECK (base_price >= 0::numeric),
  estimated_duration_minutes integer NOT NULL CHECK (estimated_duration_minutes >= 15 AND estimated_duration_minutes <= 10080),
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT service_templates_pkey PRIMARY KEY (id),
  CONSTRAINT service_templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(id)
);
CREATE TABLE public.wallet_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE,
  currency text NOT NULL DEFAULT 'PHP'::text CHECK (currency = 'PHP'::text),
  status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'FROZEN'::text, 'CLOSED'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wallet_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT wallet_accounts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.worker_profiles(account_id)
);
CREATE TABLE public.payout_destinations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind = ANY (ARRAY['GCASH'::text, 'BANK'::text])),
  label text NOT NULL CHECK (length(label) >= 1 AND length(label) <= 80),
  account_name text NOT NULL CHECK (length(account_name) >= 2 AND length(account_name) <= 120),
  account_reference text NOT NULL CHECK (length(account_reference) >= 4 AND length(account_reference) <= 120),
  is_default boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'DISABLED'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payout_destinations_pkey PRIMARY KEY (id),
  CONSTRAINT payout_destinations_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(account_id)
);
CREATE TABLE public.customer_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  id_type text NOT NULL CHECK (id_type = ANY (ARRAY['philsys'::text, 'drivers_license'::text, 'passport'::text, 'umid'::text, 'postal_id'::text])),
  id_front_url text NOT NULL CHECK (length(id_front_url) >= 3 AND length(id_front_url) <= 1024),
  id_back_url text CHECK (id_back_url IS NULL OR length(id_back_url) >= 3 AND length(id_back_url) <= 1024),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  review_notes text CHECK (review_notes IS NULL OR length(review_notes) <= 2000),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT customer_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT customer_verifications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.accounts(id),
  CONSTRAINT customer_verifications_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id)
);
CREATE TABLE public.subdivisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) >= 2 AND length(btrim(name)) <= 160),
  center_lat double precision NOT NULL CHECK (center_lat >= '-90'::integer::double precision AND center_lat <= 90::double precision),
  center_lng double precision NOT NULL CHECK (center_lng >= '-180'::integer::double precision AND center_lng <= 180::double precision),
  radius_meters integer NOT NULL DEFAULT 2000 CHECK (radius_meters >= 100 AND radius_meters <= 50000),
  boundary jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT subdivisions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.worker_presence (
  worker_id uuid NOT NULL,
  location USER-DEFINED NOT NULL,
  accuracy_meters numeric CHECK (accuracy_meters IS NULL OR accuracy_meters >= 0::numeric AND accuracy_meters <= 10000::numeric),
  online boolean NOT NULL DEFAULT true,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT worker_presence_pkey PRIMARY KEY (worker_id),
  CONSTRAINT worker_presence_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(account_id)
);
CREATE TABLE public.live_dispatch_sessions (
  service_request_id uuid NOT NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '00:02:00'::interval),
  search_radius_meters integer NOT NULL DEFAULT 5000,
  CONSTRAINT live_dispatch_sessions_pkey PRIMARY KEY (service_request_id),
  CONSTRAINT live_dispatch_sessions_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id)
);
CREATE TABLE public.service_request_dispatches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'OFFERED'::text CHECK (status = ANY (ARRAY['OFFERED'::text, 'VIEWED'::text, 'ACCEPTED'::text, 'DECLINED'::text, 'EXPIRED'::text, 'SELECTED'::text])),
  wave smallint NOT NULL CHECK (wave >= 1 AND wave <= 3),
  distance_meters numeric NOT NULL CHECK (distance_meters >= 0::numeric),
  approximate_latitude numeric NOT NULL,
  approximate_longitude numeric NOT NULL,
  offered_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  viewed_at timestamp with time zone,
  responded_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT service_request_dispatches_pkey PRIMARY KEY (id),
  CONSTRAINT service_request_dispatches_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id),
  CONSTRAINT service_request_dispatches_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(account_id)
);
CREATE TABLE public.account_blocks (
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  reason text CHECK (reason IS NULL OR length(reason) >= 3 AND length(reason) <= 500),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT account_blocks_pkey PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT account_blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.accounts(id),
  CONSTRAINT account_blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.account_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_id uuid NOT NULL,
  booking_id uuid,
  reason_code text NOT NULL CHECK (reason_code ~ '^[A-Z][A-Z0-9_]{2,79}$'::text),
  details text NOT NULL CHECK (length(details) >= 10 AND length(details) <= 2000),
  status text NOT NULL DEFAULT 'OPEN'::text CHECK (status = ANY (ARRAY['OPEN'::text, 'REVIEWING'::text, 'RESOLVED'::text, 'DISMISSED'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  resolution text CHECK (resolution IS NULL OR length(resolution) <= 2000),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT account_reports_pkey PRIMARY KEY (id),
  CONSTRAINT account_reports_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT account_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.admin_profiles(account_id),
  CONSTRAINT account_reports_reported_id_fkey FOREIGN KEY (reported_id) REFERENCES public.accounts(id),
  CONSTRAINT account_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.booking_disputes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  opened_by uuid NOT NULL,
  reason text NOT NULL CHECK (length(reason) >= 10 AND length(reason) <= 2000),
  status text NOT NULL DEFAULT 'OPEN'::text CHECK (status = ANY (ARRAY['OPEN'::text, 'REVIEWING'::text, 'RESOLVED'::text, 'DISMISSED'::text])),
  resolved_by uuid,
  resolved_at timestamp with time zone,
  resolution text CHECK (resolution IS NULL OR length(resolution) <= 2000),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT booking_disputes_pkey PRIMARY KEY (id),
  CONSTRAINT booking_disputes_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.admin_profiles(account_id),
  CONSTRAINT booking_disputes_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT booking_disputes_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.accounts(id)
);
CREATE TABLE public.booking_proof_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  storage_path text NOT NULL UNIQUE,
  content_type text NOT NULL CHECK (content_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text])),
  byte_size integer NOT NULL CHECK (byte_size >= 1 AND byte_size <= 15728640),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT booking_proof_media_pkey PRIMARY KEY (id),
  CONSTRAINT booking_proof_media_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT booking_proof_media_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(account_id)
);
CREATE TABLE public.worker_industries (
  worker_id uuid NOT NULL,
  industry_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT worker_industries_pkey PRIMARY KEY (worker_id, industry_id),
  CONSTRAINT worker_industries_industry_id_fkey FOREIGN KEY (industry_id) REFERENCES public.industries(id),
  CONSTRAINT worker_industries_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(account_id)
);