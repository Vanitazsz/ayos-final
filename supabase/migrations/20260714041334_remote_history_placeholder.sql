


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";

CREATE SCHEMA IF NOT EXISTS "extensions";
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgmq";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "postgres";


CREATE TYPE "public"."account_role" AS ENUM (
    'USER',
    'WORKER',
    'ADMIN'
);


ALTER TYPE "public"."account_role" OWNER TO "postgres";


CREATE TYPE "public"."account_status" AS ENUM (
    'PENDING_VERIFICATION',
    'ACTIVE',
    'SUSPENDED'
);


ALTER TYPE "public"."account_status" OWNER TO "postgres";


CREATE TYPE "public"."booking_status" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'WORKER_PREPARING',
    'WORKER_EN_ROUTE',
    'WORKER_ARRIVED',
    'SERVICE_STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE "public"."booking_status" OWNER TO "postgres";


CREATE TYPE "public"."cash_confirmation_party" AS ENUM (
    'USER',
    'WORKER'
);


ALTER TYPE "public"."cash_confirmation_party" OWNER TO "postgres";


CREATE TYPE "public"."content_key" AS ENUM (
    'TERMS',
    'PRIVACY',
    'REFUND_POLICY',
    'HELP_CENTER'
);


ALTER TYPE "public"."content_key" OWNER TO "postgres";


CREATE TYPE "public"."notification_audience" AS ENUM (
    'USERS',
    'WORKERS',
    'EVERYONE'
);


ALTER TYPE "public"."notification_audience" OWNER TO "postgres";


CREATE TYPE "public"."notification_status" AS ENUM (
    'DRAFT',
    'SCHEDULED',
    'SENT',
    'FAILED'
);


ALTER TYPE "public"."notification_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'CASH',
    'GCASH',
    'MAYA',
    'CREDIT_DEBIT_CARD',
    'WALLET'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'PENDING',
    'AWAITING_CONFIRMATIONS',
    'SUCCESSFUL',
    'FAILED'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."refund_status" AS ENUM (
    'PENDING',
    'PROCESSED',
    'REJECTED'
);


ALTER TYPE "public"."refund_status" OWNER TO "postgres";


CREATE TYPE "public"."request_status" AS ENUM (
    'DRAFT',
    'OPEN',
    'MATCHED',
    'BOOKED',
    'CLOSED',
    'CANCELLED'
);


ALTER TYPE "public"."request_status" OWNER TO "postgres";


CREATE TYPE "public"."review_moderation_status" AS ENUM (
    'PENDING',
    'PUBLISHED',
    'REJECTED'
);


ALTER TYPE "public"."review_moderation_status" OWNER TO "postgres";


CREATE TYPE "public"."ticket_status" AS ENUM (
    'OPEN',
    'ESCALATED',
    'RESOLVED',
    'CLOSED'
);


ALTER TYPE "public"."ticket_status" OWNER TO "postgres";


CREATE TYPE "public"."worker_approval_status" AS ENUM (
    'PENDING',
    'NEEDS_DOCUMENTS',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE "public"."worker_approval_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."invoke_queue_consumer"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare project_url text; invocation_secret text;
begin
  select decrypted_secret into project_url from vault.decrypted_secrets where name='project_url' limit 1;
  select decrypted_secret into invocation_secret from vault.decrypted_secrets where name='queue_consumer_secret' limit 1;
  if project_url is null or invocation_secret is null then return; end if;
  perform net.http_post(url:=project_url||'/functions/v1/queue-consumer',headers:=jsonb_build_object('content-type','application/json','x-ayos-queue-secret',invocation_secret),body:='{}'::jsonb,timeout_milliseconds:=10000);
end $$;


ALTER FUNCTION "private"."invoke_queue_consumer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."make_location"("p_latitude" numeric, "p_longitude" numeric) RETURNS "extensions"."geography"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
begin
  if p_latitude is null or p_longitude is null
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180 then
    raise exception using errcode='22023', message='INVALID_COORDINATES';
  end if;
  return extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography;
end $$;


ALTER FUNCTION "private"."make_location"("p_latitude" numeric, "p_longitude" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."activate_confirmed_account"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.accounts set status='ACTIVE' where id=new.id and status='PENDING_VERIFICATION';
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."activate_confirmed_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_bootstrap_status"("email" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select case when auth.role() = 'service_role' then jsonb_build_object(
    'auth_user_id', auth_user.id,
    'auth_user_exists', auth_user.id is not null,
    'account_exists', account.id is not null,
    'admin_profile_exists', admin_profile.account_id is not null,
    'app_role', auth_user.raw_app_meta_data->>'ayos_role',
    'account_is_admin', coalesce(account.role = 'ADMIN', false),
    'account_is_active', coalesce(account.status = 'ACTIVE' and account.deleted_at is null, false),
    'account_is_protected', coalesce(account.is_protected, false),
    'bootstrap_token_present', coalesce(auth_user.raw_user_meta_data->>'admin_bootstrap_token', '') <> '',
    'fully_bootstrapped', coalesce(
      account.role = 'ADMIN'
      and account.status = 'ACTIVE'
      and account.is_protected
      and account.deleted_at is null
      and admin_profile.account_id is not null
      and auth_user.raw_app_meta_data->>'ayos_role' = 'ADMIN',
      false
    ) and not (
      coalesce(auth_user.raw_user_meta_data->>'admin_bootstrap_token', '') <> ''
    )
  ) else null end
  from (select lower(btrim(email)) as normalized_email) input
  left join auth.users auth_user on lower(auth_user.email) = input.normalized_email
  left join public.accounts account on account.id = auth_user.id
  left join public.admin_profiles admin_profile on admin_profile.account_id = auth_user.id
$$;


ALTER FUNCTION "public"."admin_bootstrap_status"("email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_delete_account"("p_account_id" "uuid", "p_confirmation_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_account public.accounts;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if p_account_id is null or p_account_id = auth.uid() then
    raise exception using errcode = '42501', message = 'ACCOUNT_DELETE_NOT_ALLOWED';
  end if;

  select account.*
  into target_account
  from public.accounts account
  where account.id = p_account_id
  for update;

  if target_account.id is null then
    raise exception using errcode = 'P0002', message = 'ACCOUNT_NOT_FOUND';
  end if;

  if target_account.role = 'ADMIN' or target_account.is_protected then
    raise exception using errcode = '42501', message = 'ADMIN_ACCOUNT_DELETE_NOT_ALLOWED';
  end if;

  if lower(trim(coalesce(p_confirmation_email, ''))) <> lower(target_account.email) then
    raise exception using errcode = '22023', message = 'ACCOUNT_DELETE_CONFIRMATION_MISMATCH';
  end if;

  if exists(select 1 from storage.objects where owner_id = p_account_id::text) then
    raise exception using
      errcode = '23503',
      message = 'ACCOUNT_DELETE_BLOCKED_BY_RELATED_RECORDS',
      detail = 'Remove the account private files through the Storage API before deleting the account.';
  end if;

  begin
    -- If a retained business record references the account, the exception
    -- block rolls back every deletion in this operation.
    delete from public.user_profiles where account_id = p_account_id;
    delete from public.worker_profiles where account_id = p_account_id;
    delete from public.accounts where id = p_account_id;
    delete from auth.users where id = p_account_id;
  exception
    when foreign_key_violation then
      raise exception using
        errcode = '23503',
        message = 'ACCOUNT_DELETE_BLOCKED_BY_RELATED_RECORDS',
        detail = 'Suspend the account when bookings, payments, messages, support, or other retained records exist.';
  end;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'ACCOUNT_DELETED',
    'account',
    p_account_id::text,
    jsonb_build_object(
      'role', target_account.role,
      'email_sha256', encode(extensions.digest(lower(target_account.email), 'sha256'), 'hex')
    )
  );
end
$$;


ALTER FUNCTION "public"."admin_delete_account"("p_account_id" "uuid", "p_confirmation_email" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_setting"("setting_key" "text", "setting_value" "jsonb") RETURNS "public"."system_settings"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare result public.system_settings;
begin
  if not public.is_admin(true) then raise exception using errcode='42501',message='AAL2 administrator required'; end if;
  insert into public.system_settings(key,value,updated_by) values(setting_key,setting_value,auth.uid())
  on conflict(key) do update set value=excluded.value,updated_by=auth.uid(),updated_at=now() returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'SETTING_UPDATED','system_setting',setting_key);
  return result;
end $$;


ALTER FUNCTION "public"."admin_set_setting"("setting_key" "text", "setting_value" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "public"."content_key" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "version" "text" NOT NULL,
    "published_at" timestamp with time zone,
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."content_pages" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_upsert_content"("content_key" "public"."content_key", "title" "text", "body" "text", "version" "text", "publish" boolean) RETURNS "public"."content_pages"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare result public.content_pages;
begin
  if not public.is_admin(true) then raise exception using errcode='42501',message='AAL2 administrator required'; end if;
  insert into public.content_pages(key,title,body,version,published_at,updated_by)
  values(content_key,trim(title),body,trim(version),case when publish then now() else null end,auth.uid())
  on conflict(key) do update set title=excluded.title,body=excluded.body,version=excluded.version,published_at=excluded.published_at,updated_by=auth.uid()
  returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'CONTENT_UPDATED','content_page',result.id::text);
  return result;
end $$;


ALTER FUNCTION "public"."admin_upsert_content"("content_key" "public"."content_key", "title" "text", "body" "text", "version" "text", "publish" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_job"("queue_name" "text", "message_id" bigint) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare archived boolean;
begin
  if auth.role() <> 'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
  execute format('select pgmq.archive(%L,%s)',queue_name,message_id) into archived; return archived;
end $$;


ALTER FUNCTION "public"."archive_job"("queue_name" "text", "message_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."broadcast_application_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare topic text;
begin
  if tg_table_name='bookings' then topic := 'booking:'||new.id::text||':status';
  elsif tg_table_name='location_updates' then topic := 'booking:'||new.booking_id::text||':location';
  elsif tg_table_name='messages' then topic := 'conversation:'||new.conversation_id::text||':messages';
  elsif tg_table_name='notifications' and new.recipient_id is not null then topic := 'user:'||new.recipient_id::text||':notifications';
  end if;
  if topic is not null then perform realtime.broadcast_changes(topic,tg_op,tg_op,tg_table_name,tg_table_schema,new,old); end if;
  return coalesce(new,old);
end $$;


ALTER FUNCTION "public"."broadcast_application_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_admin_bootstrap"("email" "text", "token_hash" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  delete from private.admin_bootstrap_requests request
  where request.email = lower(btrim(email))
    and request.token_hash = cancel_admin_bootstrap.token_hash;
end
$$;


ALTER FUNCTION "public"."cancel_admin_bootstrap"("email" "text", "token_hash" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "method" "public"."payment_method" NOT NULL,
    "status" "public"."payment_status" DEFAULT 'AWAITING_CONFIRMATIONS'::"public"."payment_status" NOT NULL,
    "service_amount" numeric(12,2) NOT NULL,
    "commission_rate" numeric(5,4) DEFAULT 0.1000 NOT NULL,
    "commission_amount" numeric(12,2) NOT NULL,
    "worker_net_amount" numeric(12,2) NOT NULL,
    "homeowner_platform_charge" numeric(12,2) DEFAULT 0 NOT NULL,
    "idempotency_key" "text" NOT NULL,
    "failure_reason" "text",
    "successful_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payments_commission_rate_check" CHECK ((("commission_rate" >= (0)::numeric) AND ("commission_rate" <= (1)::numeric))),
    CONSTRAINT "payments_idempotency_key_check" CHECK ((("length"("idempotency_key") >= 16) AND ("length"("idempotency_key") <= 128))),
    CONSTRAINT "payments_method_check" CHECK (("method" = 'CASH'::"public"."payment_method")),
    CONSTRAINT "payments_service_amount_check" CHECK (("service_amount" > (0)::numeric))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."payments" IS 'FR-25–FR-28, FR-73';



CREATE OR REPLACE FUNCTION "public"."confirm_cash_payment"("p_booking_id" "uuid", "p_idempotency_key" "text") RETURNS "public"."payments"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare booking public.bookings; payment public.payments; confirmation_party public.cash_confirmation_party; amount numeric(12,2); rate numeric(5,4); commission numeric(12,2);
begin
  select * into booking from public.bookings where id=p_booking_id for update;
  if booking.status <> 'COMPLETED' or auth.uid() not in (booking.user_account_id,booking.worker_account_id) then raise exception using errcode='42501', message='Cash confirmation not allowed'; end if;
  if length(p_idempotency_key) not between 16 and 128 then raise exception using errcode='22023', message='Invalid idempotency key'; end if;
  amount := (select budget from public.service_requests where id=booking.service_request_id); rate := 0.1000; commission := round(amount*rate,2);
  insert into public.payments(booking_id,method,status,service_amount,commission_rate,commission_amount,worker_net_amount,idempotency_key)
  values(booking.id,'CASH','AWAITING_CONFIRMATIONS',amount,rate,commission,amount-commission,p_idempotency_key)
  on conflict(booking_id) do update set updated_at=now() returning * into payment;
  confirmation_party := case when auth.uid()=booking.user_account_id then 'USER'::public.cash_confirmation_party else 'WORKER'::public.cash_confirmation_party end;
  insert into public.cash_confirmations(payment_id,account_id,party) values(payment.id,auth.uid(),confirmation_party) on conflict(payment_id,party) do nothing;
  if (select count(*) from public.cash_confirmations where payment_id=payment.id)=2 then
    update public.payments set status='SUCCESSFUL',successful_at=coalesce(successful_at,now()) where id=payment.id returning * into payment;
    insert into public.receipts(payment_id,receipt_number,service_amount,commission_rate,commission_amount,worker_net_amount,homeowner_platform_charge)
    values(payment.id,'AYOS-'||upper(substr(replace(payment.id::text,'-',''),1,12)),payment.service_amount,payment.commission_rate,payment.commission_amount,payment.worker_net_amount,payment.homeowner_platform_charge) on conflict(payment_id) do nothing;
  end if;
  return payment;
end $$;


ALTER FUNCTION "public"."confirm_cash_payment"("p_booking_id" "uuid", "p_idempotency_key" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "user_account_id" "uuid" NOT NULL,
    "worker_account_id" "uuid" NOT NULL,
    "stars" smallint NOT NULL,
    "body" "text" NOT NULL,
    "recommend_worker" boolean NOT NULL,
    "moderation_status" "public"."review_moderation_status" DEFAULT 'PENDING'::"public"."review_moderation_status" NOT NULL,
    "moderated_by" "uuid",
    "moderated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reviews_body_check" CHECK ((("length"("body") >= 3) AND ("length"("body") <= 4000))),
    CONSTRAINT "reviews_stars_check" CHECK ((("stars" >= 1) AND ("stars" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_review"("p_booking_id" "uuid", "stars" integer, "body" "text", "recommend_worker" boolean) RETURNS "public"."reviews"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare booking public.bookings; result public.reviews;
begin
  select * into booking from public.bookings where id=p_booking_id;
  if booking.user_account_id is distinct from auth.uid() or booking.status <> 'COMPLETED' or not exists(select 1 from public.payments where booking_id=booking.id and status='SUCCESSFUL') then raise exception using errcode='42501', message='REVIEW_NOT_ALLOWED'; end if;
  if stars not between 1 and 5 or length(trim(body)) not between 3 and 4000 then raise exception using errcode='22023', message='Invalid review'; end if;
  insert into public.reviews(booking_id,user_account_id,worker_account_id,stars,body,recommend_worker)
  values(booking.id,booking.user_account_id,booking.worker_account_id,stars,trim(body),recommend_worker) returning * into result;
  return result;
end $$;


ALTER FUNCTION "public"."create_review"("p_booking_id" "uuid", "stars" integer, "body" "text", "recommend_worker" boolean) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_account_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "address_id" "uuid" NOT NULL,
    "ai_analysis_id" "uuid",
    "status" "public"."request_status" DEFAULT 'DRAFT'::"public"."request_status" NOT NULL,
    "description" "text" NOT NULL,
    "scheduled_at" timestamp with time zone NOT NULL,
    "budget" numeric(12,2) NOT NULL,
    "notes" "text",
    "notify_on_match" boolean DEFAULT false NOT NULL,
    "selected_worker_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "service_location" "extensions"."geography"(Point,4326) NOT NULL,
    CONSTRAINT "service_requests_budget_check" CHECK (("budget" > (0)::numeric)),
    CONSTRAINT "service_requests_description_check" CHECK ((("length"("description") >= 10) AND ("length"("description") <= 4000))),
    CONSTRAINT "service_requests_notes_check" CHECK (("length"("notes") <= 2000))
);


ALTER TABLE "public"."service_requests" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_service_request"("category_id" "uuid", "address_id" "uuid", "description" "text", "scheduled_at" timestamp with time zone, "budget" numeric, "notes" "text" DEFAULT NULL::"text", "ai_analysis_id" "uuid" DEFAULT NULL::"uuid", "notify_on_match" boolean DEFAULT false) RETURNS "public"."service_requests"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare result public.service_requests; address_location extensions.geography;
begin
  if public.current_role() <> 'USER' then raise exception using errcode='42501', message='USER role required'; end if;
  if not exists(select 1 from public.content_pages where key='TERMS' and published_at is not null) then
    raise exception using errcode='P0001', message='CONTENT_NOT_CONFIGURED';
  end if;
  select location into address_location from public.addresses
    where id = address_id and account_id = auth.uid();
  if address_location is null then raise exception using errcode='22023', message='ADDRESS_LOCATION_REQUIRED'; end if;
  if ai_analysis_id is not null and not exists(
    select 1 from public.ai_analyses where id=ai_analysis_id and account_id=auth.uid()
  ) then raise exception using errcode='42501', message='AI_ANALYSIS_UNAVAILABLE'; end if;
  if scheduled_at <= now() or budget <= 0 or length(trim(description)) not between 10 and 4000 then
    raise exception using errcode='22023', message='Invalid service request';
  end if;
  insert into public.service_requests(
    user_account_id, category_id, address_id, service_location, description,
    scheduled_at, budget, notes, ai_analysis_id, notify_on_match, status
  ) values(
    auth.uid(), category_id, address_id, address_location, trim(description),
    scheduled_at, round(budget,2), nullif(trim(notes),''), ai_analysis_id, notify_on_match, 'OPEN'
  ) returning * into result;
  return result;
end $$;


ALTER FUNCTION "public"."create_service_request"("category_id" "uuid", "address_id" "uuid", "description" "text", "scheduled_at" timestamp with time zone, "budget" numeric, "notes" "text", "ai_analysis_id" "uuid", "notify_on_match" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_role"() RETURNS "public"."account_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(
    (
      select sr.active_role from public.account_session_roles sr
      join public.account_role_memberships m on m.account_id = sr.account_id and m.role = sr.active_role and m.status = 'ACTIVE'
      where sr.account_id = auth.uid() and sr.session_id = coalesce(auth.jwt()->>'session_id', auth.uid()::text || ':legacy')
    ),
    (
      select a.role from public.accounts a where a.id = auth.uid() and a.status = 'ACTIVE' and a.deleted_at is null
    )
  )
$$;


ALTER FUNCTION "public"."current_role"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."refunds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "status" "public"."refund_status" DEFAULT 'PENDING'::"public"."refund_status" NOT NULL,
    "reason" "text" NOT NULL,
    "decided_by" "uuid",
    "decided_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "refunds_reason_check" CHECK ((("length"("reason") >= 3) AND ("length"("reason") <= 1000)))
);


ALTER TABLE "public"."refunds" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decide_refund"("p_refund_id" "uuid", "p_decision" "public"."refund_status", "p_reason" "text") RETURNS "public"."refunds"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare result public.refunds;
begin
  if not public.is_admin(true) or p_decision not in ('PROCESSED','REJECTED') then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  update public.refunds r set status=p_decision,reason=trim(p_reason),decided_by=auth.uid(),decided_at=now() where r.id=p_refund_id and r.status='PENDING' returning * into result;
  if result.id is null then raise exception using errcode='P0001', message='REFUND_DECISION_NOT_ALLOWED'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'REFUND_DECIDED','refund',p_refund_id::text,jsonb_build_object('decision',p_decision));
  return result;
end $$;


ALTER FUNCTION "public"."decide_refund"("p_refund_id" "uuid", "p_decision" "public"."refund_status", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enable_secondary_role"("p_role" "public"."account_role") RETURNS "public"."account_role"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare primary_role public.account_role; v_display_name text;
begin
  select role into primary_role from public.accounts where id = auth.uid() and status = 'ACTIVE' and deleted_at is null for update;
  if primary_role is null or primary_role = 'ADMIN' or p_role = 'ADMIN' then
    raise exception using errcode = '42501', message = 'Role switching is unavailable';
  end if;
  if p_role = 'USER' then
    select w.display_name into v_display_name from public.worker_profiles w where w.account_id = auth.uid();
    insert into public.user_profiles(account_id, display_name) values(auth.uid(), coalesce(v_display_name, 'A-YOS User'))
    on conflict(account_id) do nothing;
  elsif p_role = 'WORKER' then
    select u.display_name into v_display_name from public.user_profiles u where u.account_id = auth.uid();
    insert into public.worker_profiles(account_id, display_name) values(auth.uid(), coalesce(v_display_name, 'A-YOS Worker'))
    on conflict(account_id) do nothing;
  end if;
  insert into public.account_role_memberships(account_id, role, status) values(auth.uid(), p_role, 'ACTIVE')
  on conflict(account_id, role) do update set status = 'ACTIVE', revoked_at = null;
  return p_role;
end $$;


ALTER FUNCTION "public"."enable_secondary_role"("p_role" "public"."account_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_booking_request"("target_booking" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare booking public.bookings;
begin
  if auth.role() <> 'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
  select * into booking from public.bookings where id=target_booking for update;
  if booking.status <> 'PENDING' or booking.response_due_at > now() then return false; end if;
  update public.bookings set status='CANCELLED',cancelled_at=now(),version=version+1 where id=booking.id;
  insert into public.booking_status_events(booking_id,from_status,to_status,reason) values(booking.id,'PENDING','CANCELLED','Booking response timed out');
  update public.service_requests set status='OPEN',selected_worker_id=null,notify_on_match=true where id=booking.service_request_id;
  insert into public.notifications(recipient_id,title,body,category,status,sent_at) values(booking.user_account_id,'Worker response timed out','Choose another recommended worker.','BOOKING','SENT',now());
  return true;
end $$;


ALTER FUNCTION "public"."expire_booking_request"("target_booking" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_request_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "score" numeric(7,4) NOT NULL,
    "rank" integer NOT NULL,
    "factors" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "eligible" boolean NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "match_candidates_rank_check" CHECK (("rank" > 0))
);


ALTER TABLE "public"."match_candidates" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_matches"("p_service_request_id" "uuid") RETURNS SETOF "public"."match_candidates"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare request public.service_requests; matched_count integer;
begin
  select * into request from public.service_requests where id=p_service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') then raise exception using errcode='42501',message='Service request unavailable'; end if;
  delete from public.match_candidates where service_request_id=request.id;
  insert into public.match_candidates(service_request_id,worker_id,score,rank,factors,eligible)
  select request.id, ranked.worker_id, ranked.score, ranked.rank,
    jsonb_build_object('category',true,'available',true,'years',ranked.years,'rating',ranked.rating,'recommendation_priority',ranked.recommendation_priority),true
  from (
    select wp.account_id worker_id, ws.years, coalesce(avg(r.stars) filter(where r.moderation_status='PUBLISHED'),0)::numeric(3,2) rating,
      wp.recommendation_priority,
      (ws.years*5 + coalesce(avg(r.stars) filter(where r.moderation_status='PUBLISHED'),0)*10 + case when wp.recommendation_priority then 0.01 else 0 end)::numeric(7,4) score,
      row_number() over(order by ws.years*5 + coalesce(avg(r.stars) filter(where r.moderation_status='PUBLISHED'),0)*10 desc,wp.recommendation_priority desc,wp.account_id)::integer rank
    from public.worker_profiles wp join public.worker_skills ws on ws.worker_id=wp.account_id
    left join public.reviews r on r.worker_account_id=wp.account_id
    where wp.account_id <> request.user_account_id and ws.category_id=request.category_id and wp.approval_status='APPROVED' and wp.is_available
      and exists(select 1 from public.worker_availability wa where wa.worker_id=wp.account_id and wa.day_of_week=extract(dow from request.scheduled_at)::integer and request.scheduled_at::time between wa.start_time and wa.end_time)
    group by wp.account_id,ws.years,wp.recommendation_priority
  ) ranked where ranked.rank <= 5;
  get diagnostics matched_count=row_count;
  if matched_count>0 then update public.service_requests set status='MATCHED' where id=request.id;
  else perform pgmq.send('no_match_notifications',jsonb_build_object('service_request_id',request.id,'user_account_id',request.user_account_id),300); end if;
  return query select * from public.match_candidates where public.match_candidates.service_request_id=request.id order by rank;
end $$;


ALTER FUNCTION "public"."generate_matches"("p_service_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_booking_tracking"("p_booking_id" "uuid", "p_limit" integer DEFAULT 100) RETURNS TABLE("latitude" numeric, "longitude" numeric, "recorded_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_booking_party(p_booking_id) then
    raise exception using errcode='42501', message='BOOKING_LOCATION_UNAVAILABLE';
  end if;
  return query
    select updates.latitude, updates.longitude, updates.recorded_at
    from public.location_updates updates
    where updates.booking_id=p_booking_id
    order by updates.recorded_at desc
    limit least(greatest(p_limit,1),250);
end $$;


ALTER FUNCTION "public"."get_booking_tracking"("p_booking_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role_context"() RETURNS TABLE("primary_role" "public"."account_role", "active_role" "public"."account_role", "available_roles" "public"."account_role"[])
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select a.role, public.current_role(), array_agg(m.role order by m.role)::public.account_role[]
  from public.accounts a join public.account_role_memberships m on m.account_id = a.id and m.status = 'ACTIVE'
  where a.id = auth.uid() group by a.role
$$;


ALTER FUNCTION "public"."get_my_role_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("require_aal2" boolean DEFAULT false) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce((select role = 'ADMIN' and status = 'ACTIVE' and deleted_at is null and (not require_aal2 or not mfa_enabled or coalesce(auth.jwt()->>'aal','aal1') = 'aal2') from public.accounts where id = auth.uid()), false)
$$;


ALTER FUNCTION "public"."is_admin"("require_aal2" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_booking_party"("target_booking" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists(select 1 from public.bookings where id = target_booking and (user_account_id = auth.uid() or worker_account_id = auth.uid())) or public.is_admin(false)
$$;


ALTER FUNCTION "public"."is_booking_party"("target_booking" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_conversation_participant"("target_conversation" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists(select 1 from public.conversation_participants where conversation_id = target_conversation and account_id = auth.uid()) or public.is_admin(false)
$$;


ALTER FUNCTION "public"."is_conversation_participant"("target_conversation" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."moderate_review"("review_id" "uuid", "decision" "public"."review_moderation_status") RETURNS "public"."reviews"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare result public.reviews;
begin
  if not public.is_admin(true) or decision not in ('PUBLISHED','REJECTED') then raise exception using errcode='42501',message='AAL2 administrator required'; end if;
  update public.reviews set moderation_status=decision,moderated_by=auth.uid(),moderated_at=now() where id=review_id returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'REVIEW_MODERATED','review',review_id::text,jsonb_build_object('decision',decision));
  return result;
end $$;


ALTER FUNCTION "public"."moderate_review"("review_id" "uuid", "decision" "public"."review_moderation_status") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trash_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "snapshot" "jsonb" NOT NULL,
    "deleted_by" "uuid" NOT NULL,
    "deleted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "restored_at" timestamp with time zone,
    "restored_by" "uuid"
);


ALTER TABLE "public"."trash_entries" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."move_to_trash"("entity_type" "text", "entity_id" "text", "snapshot" "jsonb") RETURNS "public"."trash_entries"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare result public.trash_entries;
begin
  if not public.is_admin(true) then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  insert into public.trash_entries(entity_type,entity_id,snapshot,deleted_by) values(entity_type,entity_id,snapshot,auth.uid()) returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'MOVED_TO_TRASH',entity_type,entity_id);
  return result;
end $$;


ALTER FUNCTION "public"."move_to_trash"("entity_type" "text", "entity_id" "text", "snapshot" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."permanently_delete"("trash_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if public.is_admin(true) then insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'PERMANENT_DELETION_BLOCKED','trash_entry',trash_id::text,'{}'); end if;
  raise exception using errcode='42501', message='PERMANENT_DELETION_BLOCKED';
end $$;


ALTER FUNCTION "public"."permanently_delete"("trash_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_analyses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "input_type" "text" NOT NULL,
    "input_storage_path" "text",
    "transcript" "text",
    "detected_issue" "text",
    "severity" "text",
    "possible_cause" "text",
    "suggested_category_name" "text",
    "estimated_cost_minimum" numeric(12,2),
    "estimated_cost_maximum" numeric(12,2),
    "safety_advice" "text",
    "provider" "text" NOT NULL,
    "provider_reference" "text",
    "saved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "provider_model" "text",
    "idempotency_key" "text",
    "request_draft" "text",
    CONSTRAINT "ai_analyses_cost_range_check" CHECK ((("estimated_cost_minimum" IS NULL) OR ("estimated_cost_maximum" IS NULL) OR ("estimated_cost_minimum" <= "estimated_cost_maximum"))),
    CONSTRAINT "ai_analyses_idempotency_key_check" CHECK ((("idempotency_key" IS NULL) OR (("length"("idempotency_key") >= 16) AND ("length"("idempotency_key") <= 128)))),
    CONSTRAINT "ai_analyses_input_type_check" CHECK (("input_type" = ANY (ARRAY['IMAGE'::"text", 'VOICE'::"text", 'TEXT'::"text"])))
);


ALTER TABLE "public"."ai_analyses" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_analyses" IS 'FR-92–FR-98';



CREATE OR REPLACE FUNCTION "public"."persist_ai_analysis"("p_account_id" "uuid", "p_input_type" "text", "p_input_storage_path" "text", "p_transcript" "text", "p_idempotency_key" "text", "p_provider" "text", "p_model" "text", "p_provider_reference" "text", "p_result" "jsonb", "p_attempts" "jsonb") RETURNS "public"."ai_analyses"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare result public.ai_analyses;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode='42501', message='SERVICE_ROLE_REQUIRED';
  end if;
  if p_input_type not in ('TEXT','IMAGE','VOICE')
    or p_provider not in ('OPENAI','GEMINI','OPENROUTER')
    or length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode='22023', message='INVALID_AI_ANALYSIS';
  end if;
  insert into public.ai_analyses(
    account_id,input_type,input_storage_path,transcript,detected_issue,severity,
    possible_cause,suggested_category_name,estimated_cost_minimum,
    estimated_cost_maximum,safety_advice,request_draft,provider,provider_model,
    provider_reference,idempotency_key
  ) values (
    p_account_id,p_input_type,p_input_storage_path,p_transcript,
    p_result->>'detectedIssue',p_result->>'severity',p_result->>'possibleCause',
    p_result->>'suggestedCategory',(p_result->>'estimatedCostMinimum')::numeric,
    (p_result->>'estimatedCostMaximum')::numeric,p_result->>'safetyAdvice',
    p_result->>'requestDraft',p_provider,p_model,p_provider_reference,p_idempotency_key
  )
  on conflict(account_id,idempotency_key) where idempotency_key is not null
    do update set id=public.ai_analyses.id
  returning * into result;

  insert into public.ai_analysis_attempts(
    account_id,analysis_id,idempotency_key,provider,model,outcome,retryable,
    latency_ms,error_code
  )
  select p_account_id,result.id,p_idempotency_key,attempt.provider,attempt.model,
    attempt.outcome,attempt.retryable,attempt.latency_ms,attempt.error_code
  from jsonb_to_recordset(p_attempts) as attempt(
    provider text, model text, outcome text, retryable boolean,
    latency_ms integer, error_code text
  )
  on conflict(account_id,idempotency_key,provider,model,outcome) do nothing;
  return result;
end $$;


ALTER FUNCTION "public"."persist_ai_analysis"("p_account_id" "uuid", "p_input_type" "text", "p_input_storage_path" "text", "p_transcript" "text", "p_idempotency_key" "text", "p_provider" "text", "p_model" "text", "p_provider_reference" "text", "p_result" "jsonb", "p_attempts" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prepare_admin_bootstrap"("email" "text", "token_hash" "text", "display_name" "text", "expires_at" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  normalized_email text := lower(btrim(email));
  normalized_name text := btrim(display_name);
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(normalized_email) > 254 then
    raise exception using errcode = '22023', message = 'INVALID_ADMIN_EMAIL';
  end if;
  if token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'INVALID_BOOTSTRAP_TOKEN_HASH';
  end if;
  if length(normalized_name) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'INVALID_ADMIN_DISPLAY_NAME';
  end if;
  if expires_at <= now() or expires_at > now() + interval '10 minutes' then
    raise exception using errcode = '22023', message = 'INVALID_BOOTSTRAP_EXPIRATION';
  end if;
  if exists(select 1 from auth.users where lower(auth.users.email) = normalized_email)
     or exists(select 1 from public.accounts where lower(accounts.email) = normalized_email) then
    raise exception using errcode = '23505', message = 'ADMIN_ACCOUNT_ALREADY_EXISTS';
  end if;

  insert into private.admin_bootstrap_requests(email, token_hash, display_name, expires_at)
  values(normalized_email, token_hash, normalized_name, expires_at)
  on conflict on constraint admin_bootstrap_requests_pkey do update
    set token_hash = excluded.token_hash,
        display_name = excluded.display_name,
        expires_at = excluded.expires_at,
        created_at = now();
end
$_$;


ALTER FUNCTION "public"."prepare_admin_bootstrap"("email" "text", "token_hash" "text", "display_name" "text", "expires_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_account_security_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if old.role <> new.role then raise exception using errcode='42501', message='Account roles are immutable'; end if;
  if old.is_protected and new.deleted_at is not null then raise exception using errcode='42501', message='Protected administrators cannot be deleted'; end if;
  return new;
end $$;


ALTER FUNCTION "public"."prevent_account_security_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."provision_account"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  requested_role public.account_role;
  display_name text;
  mobile_value text;
  bootstrap_token text;
  bootstrap_request private.admin_bootstrap_requests;
begin
  bootstrap_token := nullif(new.raw_user_meta_data->>'admin_bootstrap_token', '');
  if bootstrap_token is not null then
    delete from private.admin_bootstrap_requests request
    where request.email = lower(new.email)
      and request.token_hash = encode(extensions.digest(bootstrap_token, 'sha256'), 'hex')
      and request.expires_at > now()
    returning * into bootstrap_request;
  end if;

  if bootstrap_request.email is not null then
    requested_role := 'ADMIN';
    display_name := bootstrap_request.display_name;
  else
    begin
      requested_role := upper(coalesce(new.raw_user_meta_data->>'role', ''))::public.account_role;
    exception when invalid_text_representation then
      raise exception using errcode = '42501', message = 'Invalid account role';
    end;
    if requested_role = 'ADMIN' then
      raise exception using errcode = '42501', message = 'Administrator self-registration is prohibited';
    end if;
    if requested_role not in ('USER', 'WORKER') then
      raise exception using errcode = '42501', message = 'Invalid account role';
    end if;
    if not exists(
      select 1 from public.content_pages where key = 'TERMS' and published_at is not null
    ) then
      raise exception using errcode = 'P0001', message = 'Registration is unavailable until Terms are published';
    end if;
    display_name := btrim(coalesce(new.raw_user_meta_data->>'name', ''));
  end if;

  mobile_value := nullif(btrim(coalesce(new.raw_user_meta_data->>'mobile', '')), '');
  if length(display_name) < 2 then
    raise exception using errcode = '22023', message = 'A valid display name is required';
  end if;

  insert into public.accounts(id, role, status, email, mobile, is_protected)
  values(
    new.id,
    requested_role,
    case when requested_role = 'ADMIN' or new.email_confirmed_at is not null
      then 'ACTIVE'::public.account_status
      else 'PENDING_VERIFICATION'::public.account_status
    end,
    lower(new.email),
    mobile_value,
    requested_role = 'ADMIN'
  );
  if requested_role = 'USER' then
    insert into public.user_profiles(account_id, display_name) values(new.id, display_name);
  elsif requested_role = 'WORKER' then
    insert into public.worker_profiles(account_id, display_name) values(new.id, display_name);
  else
    insert into public.admin_profiles(account_id, display_name) values(new.id, display_name);
  end if;
  return new;
end
$$;


ALTER FUNCTION "public"."provision_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."provision_primary_role_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.account_role_memberships(account_id, role) values(new.id, new.role)
  on conflict(account_id, role) do nothing;
  return new;
end $$;


ALTER FUNCTION "public"."provision_primary_role_membership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."read_job_batch"("queue_name" "text", "visibility_seconds" integer DEFAULT 60, "batch_size" integer DEFAULT 10) RETURNS SETOF "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if auth.role() <> 'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
  return query execute format('select to_jsonb(x) from pgmq.read(%L,%s,%s) x',queue_name,greatest(visibility_seconds,10),least(greatest(batch_size,1),100));
end $$;


ALTER FUNCTION "public"."read_job_batch"("queue_name" "text", "visibility_seconds" integer, "batch_size" integer) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."location_updates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "location" "extensions"."geography"(Point,4326) NOT NULL,
    "latitude" numeric(9,6) GENERATED ALWAYS AS ("round"(("extensions"."st_y"(("location")::"extensions"."geometry"))::numeric, 6)) STORED,
    "longitude" numeric(9,6) GENERATED ALWAYS AS ("round"(("extensions"."st_x"(("location")::"extensions"."geometry"))::numeric, 6)) STORED
);


ALTER TABLE "public"."location_updates" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_worker_location"("booking_id" "uuid", "latitude" numeric, "longitude" numeric) RETURNS "public"."location_updates"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare booking public.bookings; result public.location_updates;
begin
  select * into booking from public.bookings where id=booking_id;
  if booking.worker_account_id is distinct from auth.uid()
    or booking.status not in ('WORKER_EN_ROUTE','WORKER_ARRIVED','SERVICE_STARTED','IN_PROGRESS') then
    raise exception using errcode='42501', message='Location update not allowed';
  end if;
  insert into public.location_updates(booking_id,account_id,location)
    values(booking.id,auth.uid(),private.make_location(latitude,longitude)) returning * into result;
  return result;
end $$;


ALTER FUNCTION "public"."record_worker_location"("booking_id" "uuid", "latitude" numeric, "longitude" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_from_trash"("trash_id" "uuid") RETURNS "public"."trash_entries"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare result public.trash_entries;
begin
  if not public.is_admin(true) then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  update public.trash_entries set restored_at=now(),restored_by=auth.uid() where id=trash_id and restored_at is null returning * into result;
  if result.id is null then raise exception using errcode='P0001', message='RESTORE_NOT_ALLOWED'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'RESTORED_FROM_TRASH',result.entity_type,result.entity_id);
  return result;
end $$;


ALTER FUNCTION "public"."restore_from_trash"("trash_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worker_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "status" "public"."worker_approval_status" DEFAULT 'PENDING'::"public"."worker_approval_status" NOT NULL,
    "identity_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "document_paths" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "requested_notes" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "worker_verifications_requested_notes_check" CHECK (("length"("requested_notes") <= 2000))
);


ALTER TABLE "public"."worker_verifications" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."review_worker_verification"("verification_id" "uuid", "decision" "public"."worker_approval_status", "notes" "text" DEFAULT NULL::"text") RETURNS "public"."worker_verifications"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare verification public.worker_verifications; result public.worker_verifications;
begin
  if not public.is_admin(true) or decision not in ('APPROVED','NEEDS_DOCUMENTS','REJECTED') then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  select * into verification from public.worker_verifications where id=verification_id for update;
  update public.worker_verifications set status=decision,requested_notes=notes,reviewed_by=auth.uid(),reviewed_at=now() where id=verification.id returning * into result;
  update public.worker_profiles set approval_status=decision,approved_at=case when decision='APPROVED' then now() else null end,is_available=case when decision='APPROVED' then is_available else false end where account_id=verification.worker_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'WORKER_VERIFICATION_REVIEWED','worker_verification',verification.id::text,jsonb_build_object('decision',decision));
  return result;
end $$;


ALTER FUNCTION "public"."review_worker_verification"("verification_id" "uuid", "decision" "public"."worker_approval_status", "notes" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_request_id" "uuid" NOT NULL,
    "user_account_id" "uuid" NOT NULL,
    "worker_account_id" "uuid" NOT NULL,
    "status" "public"."booking_status" DEFAULT 'PENDING'::"public"."booking_status" NOT NULL,
    "version" integer DEFAULT 0 NOT NULL,
    "response_due_at" timestamp with time zone DEFAULT ("now"() + '00:15:00'::interval) NOT NULL,
    "accepted_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "bookings_version_check" CHECK (("version" >= 0))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


COMMENT ON TABLE "public"."bookings" IS 'FR-14–FR-18, FR-58–FR-62, FR-104';



CREATE OR REPLACE FUNCTION "public"."select_worker"("p_service_request_id" "uuid", "p_worker_id" "uuid") RETURNS "public"."bookings"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare request public.service_requests; result public.bookings; conversation_id uuid;
begin
  select * into request from public.service_requests where id = p_service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') then
    raise exception using errcode='42501', message='Service request cannot be selected';
  end if;
  if not exists(
    select 1 from public.worker_profiles wp
    join public.worker_skills ws on ws.worker_id=wp.account_id
    where wp.account_id=p_worker_id and wp.approval_status='APPROVED' and wp.is_available
      and ws.category_id=request.category_id
      and wp.service_origin is not null and wp.service_radius_meters is not null
      and extensions.st_dwithin(wp.service_origin, request.service_location, wp.service_radius_meters)
  ) then raise exception using errcode='P0001', message='WORKER_UNAVAILABLE'; end if;
  insert into public.bookings(service_request_id,user_account_id,worker_account_id)
    values(request.id,auth.uid(),p_worker_id) returning * into result;
  insert into public.booking_status_events(booking_id,to_status,actor_id)
    values(result.id,'PENDING',auth.uid());
  insert into public.conversations(booking_id) values(result.id) returning id into conversation_id;
  insert into public.conversation_participants(conversation_id,account_id)
    values(conversation_id,auth.uid()),(conversation_id,p_worker_id);
  update public.service_requests set status='BOOKED', selected_worker_id=p_worker_id where id=request.id;
  perform pgmq.send('booking_timeouts', jsonb_build_object('booking_id',result.id,'due_at',result.response_due_at,'attempt',0));
  return result;
end $$;


ALTER FUNCTION "public"."select_worker"("p_service_request_id" "uuid", "p_worker_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" NOT NULL,
    "role" "public"."account_role" NOT NULL,
    "status" "public"."account_status" DEFAULT 'ACTIVE'::"public"."account_status" NOT NULL,
    "email" "text" NOT NULL,
    "mobile" "text",
    "is_protected" boolean DEFAULT false NOT NULL,
    "mfa_enabled" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "accounts_email_check" CHECK (("length"("email") <= 254)),
    CONSTRAINT "accounts_mobile_check" CHECK ((("mobile" IS NULL) OR ("mobile" ~ '^\+[1-9][0-9]{7,14}$'::"text")))
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."accounts" IS 'FR-01–FR-09, FR-19, FR-49–FR-51, FR-89–FR-91, FR-99–FR-101';



CREATE OR REPLACE FUNCTION "public"."set_account_status"("account_id" "uuid", "next_status" "public"."account_status") RETURNS "public"."accounts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare result public.accounts;
begin
  if not public.is_admin(true) then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  update public.accounts set status=next_status where id=account_id returning * into result;
  if result.id is null then raise exception using errcode='P0002', message='Account not found'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'ACCOUNT_STATUS_CHANGED','account',account_id::text,jsonb_build_object('status',next_status));
  return result;
end $$;


ALTER FUNCTION "public"."set_account_status"("account_id" "uuid", "next_status" "public"."account_status") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "line1" "text" NOT NULL,
    "line2" "text",
    "barangay" "text" NOT NULL,
    "city" "text" NOT NULL,
    "province" "text" NOT NULL,
    "postal_code" "text",
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "location" "extensions"."geography"(Point,4326),
    "latitude" numeric(9,6) GENERATED ALWAYS AS ("round"(("extensions"."st_y"(("location")::"extensions"."geometry"))::numeric, 6)) STORED,
    "longitude" numeric(9,6) GENERATED ALWAYS AS ("round"(("extensions"."st_x"(("location")::"extensions"."geometry"))::numeric, 6)) STORED,
    "recipient_name" "text",
    "contact_mobile" "text",
    "instructions" "text",
    "archived_at" timestamp with time zone,
    CONSTRAINT "addresses_barangay_check" CHECK (("length"("barangay") <= 120)),
    CONSTRAINT "addresses_city_check" CHECK (("length"("city") <= 120)),
    CONSTRAINT "addresses_contact_mobile_check" CHECK ((("contact_mobile" IS NULL) OR ("contact_mobile" ~ '^\+[1-9][0-9]{7,14}$'::"text"))),
    CONSTRAINT "addresses_instructions_check" CHECK ((("instructions" IS NULL) OR ("length"("instructions") <= 1000))),
    CONSTRAINT "addresses_label_check" CHECK ((("length"("label") >= 1) AND ("length"("label") <= 80))),
    CONSTRAINT "addresses_line1_check" CHECK (("length"("line1") <= 255)),
    CONSTRAINT "addresses_line2_check" CHECK (("length"("line2") <= 255)),
    CONSTRAINT "addresses_province_check" CHECK (("length"("province") <= 120)),
    CONSTRAINT "addresses_recipient_name_check" CHECK ((("recipient_name" IS NULL) OR (("length"("recipient_name") >= 2) AND ("length"("recipient_name") <= 120))))
);


ALTER TABLE "public"."addresses" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_address_location"("p_address_id" "uuid", "p_latitude" numeric, "p_longitude" numeric) RETURNS "public"."addresses"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare result public.addresses;
begin
  update public.addresses
  set location = private.make_location(p_latitude, p_longitude)
  where id = p_address_id and account_id = auth.uid()
  returning * into result;
  if result.id is null then
    raise exception using errcode='42501', message='ADDRESS_UNAVAILABLE';
  end if;
  return result;
end $$;


ALTER FUNCTION "public"."set_address_location"("p_address_id" "uuid", "p_latitude" numeric, "p_longitude" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_admin_mfa_enabled"("enabled" boolean) RETURNS "public"."accounts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare result public.accounts;
begin
  if public.current_role() <> 'ADMIN' or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then raise exception using errcode='42501',message='AAL2 administrator required'; end if;
  update public.accounts set mfa_enabled=enabled where id=auth.uid() returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'ADMIN_MFA_CHANGED','account',auth.uid()::text,jsonb_build_object('enabled',enabled));
  return result;
end $$;


ALTER FUNCTION "public"."set_admin_mfa_enabled"("enabled" boolean) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worker_profiles" (
    "account_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "avatar_path" "text",
    "bio" "text",
    "experience" "text",
    "service_area" "text",
    "approval_status" "public"."worker_approval_status" DEFAULT 'PENDING'::"public"."worker_approval_status" NOT NULL,
    "recommendation_priority" boolean DEFAULT false NOT NULL,
    "is_available" boolean DEFAULT false NOT NULL,
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "service_origin" "extensions"."geography"(Point,4326),
    "service_radius_meters" integer,
    "latitude" numeric(9,6) GENERATED ALWAYS AS ("round"(("extensions"."st_y"(("service_origin")::"extensions"."geometry"))::numeric, 6)) STORED,
    "longitude" numeric(9,6) GENERATED ALWAYS AS ("round"(("extensions"."st_x"(("service_origin")::"extensions"."geometry"))::numeric, 6)) STORED,
    CONSTRAINT "worker_profiles_bio_check" CHECK (("length"("bio") <= 2000)),
    CONSTRAINT "worker_profiles_display_name_check" CHECK ((("length"("display_name") >= 2) AND ("length"("display_name") <= 120))),
    CONSTRAINT "worker_profiles_experience_check" CHECK (("length"("experience") <= 4000)),
    CONSTRAINT "worker_profiles_service_area_check" CHECK (("length"("service_area") <= 255)),
    CONSTRAINT "worker_profiles_service_radius_meters_check" CHECK ((("service_radius_meters" >= 100) AND ("service_radius_meters" <= 200000)))
);


ALTER TABLE "public"."worker_profiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_recommendation_priority"("worker_id" "uuid", "enabled" boolean) RETURNS "public"."worker_profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare result public.worker_profiles;
begin
  if not public.is_admin(true) then raise exception using errcode='42501', message='AAL2 administrator required'; end if;
  update public.worker_profiles set recommendation_priority=enabled where account_id=worker_id returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'RECOMMENDATION_PRIORITY_CHANGED','worker',worker_id::text,jsonb_build_object('enabled',enabled));
  return result;
end $$;


ALTER FUNCTION "public"."set_recommendation_priority"("worker_id" "uuid", "enabled" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin new.updated_at = now(); return new; end $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_worker_service_area"("p_latitude" numeric, "p_longitude" numeric, "p_radius_meters" integer) RETURNS "public"."worker_profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare result public.worker_profiles;
begin
  if public.current_role() <> 'WORKER' then
    raise exception using errcode='42501', message='WORKER_ROLE_REQUIRED';
  end if;
  if p_radius_meters not between 100 and 200000 then
    raise exception using errcode='22023', message='INVALID_SERVICE_RADIUS';
  end if;
  update public.worker_profiles
  set service_origin = private.make_location(p_latitude, p_longitude),
      service_radius_meters = p_radius_meters
  where account_id = auth.uid()
  returning * into result;
  return result;
end $$;


ALTER FUNCTION "public"."set_worker_service_area"("p_latitude" numeric, "p_longitude" numeric, "p_radius_meters" integer) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "service_request_id" "uuid",
    "worker_account_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_worker_conversation"("p_service_request_id" "uuid", "p_worker_id" "uuid") RETURNS "public"."conversations"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare result public.conversations;
begin
  if not exists(select 1 from public.service_requests r where r.id=p_service_request_id and r.user_account_id=auth.uid() and r.status in ('OPEN','MATCHED'))
    or not exists(select 1 from public.match_candidates m where m.service_request_id=p_service_request_id and m.worker_id=p_worker_id and m.eligible) then
    raise exception using errcode='42501',message='Conversation is unavailable'; end if;
  insert into public.conversations(service_request_id,worker_account_id) values(p_service_request_id,p_worker_id)
  on conflict(service_request_id,worker_account_id) where booking_id is null do update set updated_at=now() returning * into result;
  insert into public.conversation_participants(conversation_id,account_id) values(result.id,auth.uid()),(result.id,p_worker_id) on conflict do nothing;
  return result;
end $$;


ALTER FUNCTION "public"."start_worker_conversation"("p_service_request_id" "uuid", "p_worker_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."switch_active_role"("p_role" "public"."account_role") RETURNS "public"."account_role"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare session_identifier text;
begin
  if p_role = 'ADMIN' or not exists (
    select 1 from public.account_role_memberships m where m.account_id = auth.uid() and m.role = p_role and m.status = 'ACTIVE'
  ) then raise exception using errcode = '42501', message = 'Role is unavailable'; end if;
  session_identifier := coalesce(auth.jwt()->>'session_id', auth.uid()::text || ':legacy');
  insert into public.account_session_roles(session_id, account_id, active_role)
  values(session_identifier, auth.uid(), p_role)
  on conflict(session_id) do update set active_role = excluded.active_role, switched_at = now()
  where public.account_session_roles.account_id = auth.uid();
  return p_role;
end $$;


ALTER FUNCTION "public"."switch_active_role"("p_role" "public"."account_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_booking"("p_booking_id" "uuid", "p_target_status" "public"."booking_status", "p_expected_version" integer, "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."bookings"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare booking public.bookings; allowed boolean := false; result public.bookings;
begin
  select * into booking from public.bookings b where b.id=p_booking_id for update;
  if booking.id is null or not public.is_booking_party(p_booking_id) then raise exception using errcode='42501', message='Booking unavailable'; end if;
  if booking.version <> p_expected_version then raise exception using errcode='40001', message='BOOKING_VERSION_CONFLICT'; end if;
  allowed := case booking.status
    when 'PENDING' then p_target_status in ('ACCEPTED','CANCELLED')
    when 'ACCEPTED' then p_target_status in ('WORKER_PREPARING','CANCELLED')
    when 'WORKER_PREPARING' then p_target_status in ('WORKER_EN_ROUTE','CANCELLED')
    when 'WORKER_EN_ROUTE' then p_target_status in ('WORKER_ARRIVED','CANCELLED')
    when 'WORKER_ARRIVED' then p_target_status in ('SERVICE_STARTED','CANCELLED')
    when 'SERVICE_STARTED' then p_target_status in ('IN_PROGRESS','CANCELLED')
    when 'IN_PROGRESS' then p_target_status in ('COMPLETED','CANCELLED') else false end;
  if not allowed then raise exception using errcode='P0001', message='INVALID_BOOKING_TRANSITION'; end if;
  if p_target_status not in ('CANCELLED') and auth.uid() <> booking.worker_account_id and not public.is_admin(true) then raise exception using errcode='42501', message='Worker or administrator required'; end if;
  if p_target_status='CANCELLED' and (p_reason is null or length(trim(p_reason)) < 3) then raise exception using errcode='22023', message='Cancellation reason required'; end if;
  if p_target_status='ACCEPTED' and auth.uid() <> booking.worker_account_id then raise exception using errcode='42501', message='Assigned worker required'; end if;
  update public.bookings set status=p_target_status, version=version+1,
    accepted_at=case when p_target_status='ACCEPTED' then now() else accepted_at end,
    completed_at=case when p_target_status='COMPLETED' then now() else completed_at end,
    cancelled_at=case when p_target_status='CANCELLED' then now() else cancelled_at end
  where id=booking.id returning * into result;
  insert into public.booking_status_events(booking_id,from_status,to_status,actor_id,reason) values(booking.id,booking.status,p_target_status,auth.uid(),nullif(trim(p_reason),''));
  if p_target_status='CANCELLED' then
    insert into public.cancellations(booking_id,cancelled_by,reason,policy_version)
    values(booking.id,auth.uid(),trim(p_reason),(select version from public.content_pages where key='REFUND_POLICY' and published_at is not null))
    on conflict on constraint cancellations_booking_id_key do nothing;
    update public.service_requests set status='OPEN',selected_worker_id=null where id=booking.service_request_id;
  elsif p_target_status='COMPLETED' then update public.service_requests set status='CLOSED' where id=booking.service_request_id; end if;
  return result;
end $$;


ALTER FUNCTION "public"."transition_booking"("p_booking_id" "uuid", "p_target_status" "public"."booking_status", "p_expected_version" integer, "p_reason" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "booking_id" "uuid",
    "subject" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "public"."ticket_status" DEFAULT 'OPEN'::"public"."ticket_status" NOT NULL,
    "resolution" "text",
    "escalated_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "support_tickets_description_check" CHECK ((("length"("description") >= 10) AND ("length"("description") <= 4000))),
    CONSTRAINT "support_tickets_subject_check" CHECK ((("length"("subject") >= 3) AND ("length"("subject") <= 200)))
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_support_ticket"("p_ticket_id" "uuid", "p_next_status" "public"."ticket_status", "p_resolution" "text" DEFAULT NULL::"text") RETURNS "public"."support_tickets"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare result public.support_tickets;
begin
  if not public.is_admin(true) then raise exception using errcode='42501',message='AAL2 administrator required'; end if;
  update public.support_tickets t set status=p_next_status,resolution=p_resolution,
    escalated_at=case when p_next_status='ESCALATED' then now() else t.escalated_at end,
    resolved_at=case when p_next_status='RESOLVED' then now() else t.resolved_at end,
    closed_at=case when p_next_status='CLOSED' then now() else t.closed_at end
  where t.id=p_ticket_id returning * into result;
  return result;
end $$;


ALTER FUNCTION "public"."update_support_ticket"("p_ticket_id" "uuid", "p_next_status" "public"."ticket_status", "p_resolution" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."admin_bootstrap_requests" (
    "email" "text" NOT NULL,
    "token_hash" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "admin_bootstrap_requests_check" CHECK ((("expires_at" > "created_at") AND ("expires_at" <= ("created_at" + '00:10:00'::interval)))),
    CONSTRAINT "admin_bootstrap_requests_display_name_check" CHECK ((("length"("display_name") >= 2) AND ("length"("display_name") <= 120))),
    CONSTRAINT "admin_bootstrap_requests_email_check" CHECK ((("email" = "lower"("btrim"("email"))) AND (("length"("email") >= 3) AND ("length"("email") <= 254)))),
    CONSTRAINT "admin_bootstrap_requests_token_hash_check" CHECK (("token_hash" ~ '^[0-9a-f]{64}$'::"text"))
);


ALTER TABLE "private"."admin_bootstrap_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."account_role_memberships" (
    "account_id" "uuid" NOT NULL,
    "role" "public"."account_role" NOT NULL,
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "account_role_memberships_check" CHECK ((("role" <> 'ADMIN'::"public"."account_role") OR ("status" = 'ACTIVE'::"text"))),
    CONSTRAINT "account_role_memberships_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'REVOKED'::"text"])))
);


ALTER TABLE "public"."account_role_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."account_session_roles" (
    "session_id" "text" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "active_role" "public"."account_role" NOT NULL,
    "switched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "account_session_roles_active_role_check" CHECK (("active_role" <> 'ADMIN'::"public"."account_role"))
);


ALTER TABLE "public"."account_session_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_profiles" (
    "account_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "admin_profiles_display_name_check" CHECK ((("length"("display_name") >= 2) AND ("length"("display_name") <= 120)))
);


ALTER TABLE "public"."admin_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_analysis_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "analysis_id" "uuid",
    "idempotency_key" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "model" "text" NOT NULL,
    "outcome" "text" NOT NULL,
    "retryable" boolean NOT NULL,
    "latency_ms" integer NOT NULL,
    "error_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_analysis_attempts_idempotency_key_check" CHECK ((("length"("idempotency_key") >= 16) AND ("length"("idempotency_key") <= 128))),
    CONSTRAINT "ai_analysis_attempts_latency_ms_check" CHECK (("latency_ms" >= 0)),
    CONSTRAINT "ai_analysis_attempts_outcome_check" CHECK (("outcome" = ANY (ARRAY['SUCCEEDED'::"text", 'FAILED'::"text", 'SKIPPED'::"text"]))),
    CONSTRAINT "ai_analysis_attempts_provider_check" CHECK (("provider" = ANY (ARRAY['OPENAI'::"text", 'GEMINI'::"text", 'OPENROUTER'::"text"])))
);


ALTER TABLE "public"."ai_analysis_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "text",
    "correlation_id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_status_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "from_status" "public"."booking_status",
    "to_status" "public"."booking_status" NOT NULL,
    "actor_id" "uuid",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "booking_status_events_reason_check" CHECK (("length"("reason") <= 1000))
);


ALTER TABLE "public"."booking_status_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cancellations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "cancelled_by" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "policy_version" "text" NOT NULL,
    "confirmed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cancellations_reason_check" CHECK ((("length"("reason") >= 3) AND ("length"("reason") <= 1000)))
);


ALTER TABLE "public"."cancellations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_confirmations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "party" "public"."cash_confirmation_party" NOT NULL,
    "confirmed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cash_confirmations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "conversation_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorites" (
    "user_account_id" "uuid" NOT NULL,
    "worker_account_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_failures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "queue_name" "text" NOT NULL,
    "message_id" bigint,
    "payload" "jsonb" NOT NULL,
    "attempts" integer NOT NULL,
    "error" "text" NOT NULL,
    "failed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid"
);


ALTER TABLE "public"."job_failures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "storage_path" "text",
    "location" "jsonb",
    "content_type" "text",
    "byte_size" integer,
    CONSTRAINT "message_attachments_byte_size_check" CHECK ((("byte_size" IS NULL) OR (("byte_size" >= 1) AND ("byte_size" <= 15728640)))),
    CONSTRAINT "message_attachments_kind_check" CHECK (("kind" = ANY (ARRAY['IMAGE'::"text", 'LOCATION'::"text", 'VOICE'::"text"])))
);


ALTER TABLE "public"."message_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "target_locale" "text" NOT NULL,
    "translated" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."message_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "body" "text",
    "original_locale" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "messages_body_check" CHECK (("length"("body") <= 4000)),
    CONSTRAINT "messages_check" CHECK ((("body" IS NOT NULL) OR ("original_locale" IS NULL)))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_id" "uuid",
    "audience" "public"."notification_audience",
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "category" "text" NOT NULL,
    "status" "public"."notification_status" DEFAULT 'DRAFT'::"public"."notification_status" NOT NULL,
    "scheduled_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "source_key" "text",
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_check" CHECK ((("recipient_id" IS NOT NULL) OR ("audience" IS NOT NULL))),
    CONSTRAINT "notifications_title_check" CHECK ((("length"("title") >= 1) AND ("length"("title") <= 160)))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "receipt_number" "text" NOT NULL,
    "service_amount" numeric(12,2) NOT NULL,
    "commission_rate" numeric(5,4) NOT NULL,
    "commission_amount" numeric(12,2) NOT NULL,
    "worker_net_amount" numeric(12,2) NOT NULL,
    "homeowner_platform_charge" numeric(12,2) NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_exports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_type" "text" NOT NULL,
    "parameters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "storage_path" "text",
    "status" "text" NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "failure_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    CONSTRAINT "report_exports_status_check" CHECK (("status" = ANY (ARRAY['QUEUED'::"text", 'PROCESSING'::"text", 'COMPLETED'::"text", 'FAILED'::"text"])))
);


ALTER TABLE "public"."report_exports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_request_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "content_type" "text" NOT NULL,
    "byte_size" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "request_media_byte_size_check" CHECK ((("byte_size" > 0) AND ("byte_size" <= 15728640)))
);


ALTER TABLE "public"."request_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "content_type" "text" NOT NULL,
    "byte_size" integer NOT NULL,
    CONSTRAINT "review_media_byte_size_check" CHECK ((("byte_size" > 0) AND ("byte_size" <= 15728640)))
);


ALTER TABLE "public"."review_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "service_categories_description_check" CHECK (("length"("description") <= 1000)),
    CONSTRAINT "service_categories_name_check" CHECK ((("length"("name") >= 2) AND ("length"("name") <= 120)))
);


ALTER TABLE "public"."service_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "account_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "avatar_path" "text",
    "notification_preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_profiles_display_name_check" CHECK ((("length"("display_name") >= 2) AND ("length"("display_name") <= 120)))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worker_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "day_of_week" smallint NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "timezone" "text" DEFAULT 'Asia/Manila'::"text" NOT NULL,
    CONSTRAINT "worker_availability_check" CHECK (("start_time" < "end_time")),
    CONSTRAINT "worker_availability_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."worker_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worker_skills" (
    "worker_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "years" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "worker_skills_years_check" CHECK ((("years" >= 0) AND ("years" <= 80)))
);


ALTER TABLE "public"."worker_skills" OWNER TO "postgres";


ALTER TABLE ONLY "private"."admin_bootstrap_requests"
    ADD CONSTRAINT "admin_bootstrap_requests_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "public"."account_role_memberships"
    ADD CONSTRAINT "account_role_memberships_pkey" PRIMARY KEY ("account_id", "role");



ALTER TABLE ONLY "public"."account_session_roles"
    ADD CONSTRAINT "account_session_roles_pkey" PRIMARY KEY ("session_id");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_mobile_key" UNIQUE ("mobile");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_profiles"
    ADD CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("account_id");



ALTER TABLE ONLY "public"."ai_analyses"
    ADD CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_analysis_attempts"
    ADD CONSTRAINT "ai_analysis_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_status_events"
    ADD CONSTRAINT "booking_status_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cancellations"
    ADD CONSTRAINT "cancellations_booking_id_key" UNIQUE ("booking_id");



ALTER TABLE ONLY "public"."cancellations"
    ADD CONSTRAINT "cancellations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_confirmations"
    ADD CONSTRAINT "cash_confirmations_payment_id_party_key" UNIQUE ("payment_id", "party");



ALTER TABLE ONLY "public"."cash_confirmations"
    ADD CONSTRAINT "cash_confirmations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_pages"
    ADD CONSTRAINT "content_pages_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."content_pages"
    ADD CONSTRAINT "content_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id", "account_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_booking_id_key" UNIQUE ("booking_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_account_id", "worker_account_id");



ALTER TABLE ONLY "public"."job_failures"
    ADD CONSTRAINT "job_failures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_updates"
    ADD CONSTRAINT "location_updates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_candidates"
    ADD CONSTRAINT "match_candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_candidates"
    ADD CONSTRAINT "match_candidates_service_request_id_worker_id_key" UNIQUE ("service_request_id", "worker_id");



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_translations"
    ADD CONSTRAINT "message_translations_message_id_target_locale_key" UNIQUE ("message_id", "target_locale");



ALTER TABLE ONLY "public"."message_translations"
    ADD CONSTRAINT "message_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_source_key_key" UNIQUE ("source_key");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_booking_id_key" UNIQUE ("booking_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_idempotency_key_key" UNIQUE ("idempotency_key");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_payment_id_key" UNIQUE ("payment_id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_receipt_number_key" UNIQUE ("receipt_number");



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_payment_id_key" UNIQUE ("payment_id");



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_exports"
    ADD CONSTRAINT "report_exports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_media"
    ADD CONSTRAINT "request_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_media"
    ADD CONSTRAINT "review_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_booking_id_key" UNIQUE ("booking_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_categories"
    ADD CONSTRAINT "service_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."service_categories"
    ADD CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_ai_analysis_id_key" UNIQUE ("ai_analysis_id");



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."trash_entries"
    ADD CONSTRAINT "trash_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("account_id");



ALTER TABLE ONLY "public"."worker_availability"
    ADD CONSTRAINT "worker_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."worker_availability"
    ADD CONSTRAINT "worker_availability_worker_id_day_of_week_start_time_end_ti_key" UNIQUE ("worker_id", "day_of_week", "start_time", "end_time");



ALTER TABLE ONLY "public"."worker_profiles"
    ADD CONSTRAINT "worker_profiles_pkey" PRIMARY KEY ("account_id");



ALTER TABLE ONLY "public"."worker_skills"
    ADD CONSTRAINT "worker_skills_pkey" PRIMARY KEY ("worker_id", "category_id");



ALTER TABLE ONLY "public"."worker_verifications"
    ADD CONSTRAINT "worker_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."worker_verifications"
    ADD CONSTRAINT "worker_verifications_worker_id_key" UNIQUE ("worker_id");



CREATE INDEX "account_session_roles_account_idx" ON "public"."account_session_roles" USING "btree" ("account_id", "switched_at" DESC);



CREATE INDEX "accounts_role_status_idx" ON "public"."accounts" USING "btree" ("role", "status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "addresses_location_gix" ON "public"."addresses" USING "gist" ("location");



CREATE UNIQUE INDEX "ai_analyses_account_idempotency_idx" ON "public"."ai_analyses" USING "btree" ("account_id", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE INDEX "ai_analysis_attempts_account_time_idx" ON "public"."ai_analysis_attempts" USING "btree" ("account_id", "created_at" DESC);



CREATE UNIQUE INDEX "ai_analysis_attempts_idempotent_idx" ON "public"."ai_analysis_attempts" USING "btree" ("account_id", "idempotency_key", "provider", "model", "outcome");



CREATE INDEX "audit_entity_idx" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id", "created_at" DESC);



CREATE INDEX "bookings_user_status_idx" ON "public"."bookings" USING "btree" ("user_account_id", "status");



CREATE INDEX "bookings_worker_status_idx" ON "public"."bookings" USING "btree" ("worker_account_id", "status");



CREATE INDEX "conversation_participants_account_idx" ON "public"."conversation_participants" USING "btree" ("account_id");



CREATE UNIQUE INDEX "job_failures_queue_message_idx" ON "public"."job_failures" USING "btree" ("queue_name", "message_id");



CREATE INDEX "location_updates_booking_time_idx" ON "public"."location_updates" USING "btree" ("booking_id", "recorded_at" DESC);



CREATE INDEX "location_updates_location_gix" ON "public"."location_updates" USING "gist" ("location");



CREATE INDEX "match_candidate_order_idx" ON "public"."match_candidates" USING "btree" ("service_request_id", "eligible", "rank");



CREATE INDEX "messages_conversation_time_idx" ON "public"."messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "notifications_recipient_time_idx" ON "public"."notifications" USING "btree" ("recipient_id", "created_at" DESC);



CREATE INDEX "notifications_schedule_idx" ON "public"."notifications" USING "btree" ("status", "scheduled_at");



CREATE UNIQUE INDEX "one_active_booking_per_request" ON "public"."bookings" USING "btree" ("service_request_id") WHERE ("status" <> 'CANCELLED'::"public"."booking_status");



CREATE UNIQUE INDEX "one_default_address_per_account" ON "public"."addresses" USING "btree" ("account_id") WHERE "is_default";



CREATE UNIQUE INDEX "one_preselection_conversation" ON "public"."conversations" USING "btree" ("service_request_id", "worker_account_id") WHERE ("booking_id" IS NULL);



CREATE INDEX "reviews_worker_status_idx" ON "public"."reviews" USING "btree" ("worker_account_id", "moderation_status");



CREATE INDEX "service_requests_location_gix" ON "public"."service_requests" USING "gist" ("service_location");



CREATE INDEX "service_requests_matching_idx" ON "public"."service_requests" USING "btree" ("category_id", "status", "scheduled_at");



CREATE INDEX "service_requests_user_status_idx" ON "public"."service_requests" USING "btree" ("user_account_id", "status");



CREATE INDEX "worker_discovery_idx" ON "public"."worker_profiles" USING "btree" ("approval_status", "is_available", "recommendation_priority");



CREATE INDEX "worker_profiles_service_origin_gix" ON "public"."worker_profiles" USING "gist" ("service_origin");



CREATE OR REPLACE TRIGGER "broadcast_booking_change" AFTER INSERT OR UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."broadcast_application_change"();



CREATE OR REPLACE TRIGGER "broadcast_location_change" AFTER INSERT ON "public"."location_updates" FOR EACH ROW EXECUTE FUNCTION "public"."broadcast_application_change"();



CREATE OR REPLACE TRIGGER "broadcast_message_change" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."broadcast_application_change"();



CREATE OR REPLACE TRIGGER "broadcast_notification_change" AFTER INSERT OR UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."broadcast_application_change"();



CREATE OR REPLACE TRIGGER "protect_account" BEFORE UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_account_security_changes"();



CREATE OR REPLACE TRIGGER "provision_primary_role_membership" AFTER INSERT ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."provision_primary_role_membership"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."addresses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."admin_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."content_pages" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."service_categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."service_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."support_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."worker_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."worker_verifications" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."account_role_memberships"
    ADD CONSTRAINT "account_role_memberships_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."account_session_roles"
    ADD CONSTRAINT "account_session_roles_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_profiles"
    ADD CONSTRAINT "admin_profiles_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ai_analyses"
    ADD CONSTRAINT "ai_analyses_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ai_analysis_attempts"
    ADD CONSTRAINT "ai_analysis_attempts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ai_analysis_attempts"
    ADD CONSTRAINT "ai_analysis_attempts_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "public"."ai_analyses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."booking_status_events"
    ADD CONSTRAINT "booking_status_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."booking_status_events"
    ADD CONSTRAINT "booking_status_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_account_id_fkey" FOREIGN KEY ("user_account_id") REFERENCES "public"."user_profiles"("account_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_worker_account_id_fkey" FOREIGN KEY ("worker_account_id") REFERENCES "public"."worker_profiles"("account_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cancellations"
    ADD CONSTRAINT "cancellations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cancellations"
    ADD CONSTRAINT "cancellations_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cash_confirmations"
    ADD CONSTRAINT "cash_confirmations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cash_confirmations"
    ADD CONSTRAINT "cash_confirmations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_pages"
    ADD CONSTRAINT "content_pages_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_worker_account_id_fkey" FOREIGN KEY ("worker_account_id") REFERENCES "public"."worker_profiles"("account_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_user_account_id_fkey" FOREIGN KEY ("user_account_id") REFERENCES "public"."user_profiles"("account_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_worker_account_id_fkey" FOREIGN KEY ("worker_account_id") REFERENCES "public"."worker_profiles"("account_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_failures"
    ADD CONSTRAINT "job_failures_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."location_updates"
    ADD CONSTRAINT "location_updates_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."location_updates"
    ADD CONSTRAINT "location_updates_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_candidates"
    ADD CONSTRAINT "match_candidates_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_candidates"
    ADD CONSTRAINT "match_candidates_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."worker_profiles"("account_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_translations"
    ADD CONSTRAINT "message_translations_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."report_exports"
    ADD CONSTRAINT "report_exports_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."request_media"
    ADD CONSTRAINT "request_media_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_media"
    ADD CONSTRAINT "review_media_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_moderated_by_fkey" FOREIGN KEY ("moderated_by") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_account_id_fkey" FOREIGN KEY ("user_account_id") REFERENCES "public"."user_profiles"("account_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_worker_account_id_fkey" FOREIGN KEY ("worker_account_id") REFERENCES "public"."worker_profiles"("account_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_ai_analysis_id_fkey" FOREIGN KEY ("ai_analysis_id") REFERENCES "public"."ai_analyses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_selected_worker_id_fkey" FOREIGN KEY ("selected_worker_id") REFERENCES "public"."worker_profiles"("account_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_user_account_id_fkey" FOREIGN KEY ("user_account_id") REFERENCES "public"."user_profiles"("account_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trash_entries"
    ADD CONSTRAINT "trash_entries_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."trash_entries"
    ADD CONSTRAINT "trash_entries_restored_by_fkey" FOREIGN KEY ("restored_by") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."worker_availability"
    ADD CONSTRAINT "worker_availability_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."worker_profiles"("account_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."worker_profiles"
    ADD CONSTRAINT "worker_profiles_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."worker_skills"
    ADD CONSTRAINT "worker_skills_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."worker_skills"
    ADD CONSTRAINT "worker_skills_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."worker_profiles"("account_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."worker_verifications"
    ADD CONSTRAINT "worker_verifications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."worker_verifications"
    ADD CONSTRAINT "worker_verifications_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."worker_profiles"("account_id") ON DELETE CASCADE;



ALTER TABLE "private"."admin_bootstrap_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."account_role_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."account_session_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "accounts_self_or_admin_read" ON "public"."accounts" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_admin"(false)));



ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "addresses_owner_or_admin_read" ON "public"."addresses" FOR SELECT TO "authenticated" USING ((("account_id" = "auth"."uid"()) OR "public"."is_admin"(false)));



CREATE POLICY "addresses_owner_write" ON "public"."addresses" TO "authenticated" USING (("account_id" = "auth"."uid"())) WITH CHECK (("account_id" = "auth"."uid"()));



CREATE POLICY "admin_profile_self_or_admin" ON "public"."admin_profiles" FOR SELECT TO "authenticated" USING ((("account_id" = "auth"."uid"()) OR "public"."is_admin"(false)));



ALTER TABLE "public"."admin_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_analyses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_analysis_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_attempts_owner_or_admin_read" ON "public"."ai_analysis_attempts" FOR SELECT TO "authenticated" USING ((("account_id" = "auth"."uid"()) OR "public"."is_admin"(false)));



CREATE POLICY "analyses_owner_or_admin" ON "public"."ai_analyses" FOR SELECT TO "authenticated" USING ((("account_id" = "auth"."uid"()) OR "public"."is_admin"(false)));



CREATE POLICY "attachments_member_read" ON "public"."message_attachments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."messages" "m"
  WHERE (("m"."id" = "message_attachments"."message_id") AND "public"."is_conversation_participant"("m"."conversation_id")))));



CREATE POLICY "attachments_sender_insert" ON "public"."message_attachments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."messages" "m"
  WHERE (("m"."id" = "message_attachments"."message_id") AND ("m"."sender_id" = "auth"."uid"()) AND "public"."is_conversation_participant"("m"."conversation_id")))));



CREATE POLICY "audit_admin_read" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("public"."is_admin"(true));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "availability_owner_write" ON "public"."worker_availability" TO "authenticated" USING (("worker_id" = "auth"."uid"())) WITH CHECK (("worker_id" = "auth"."uid"()));



CREATE POLICY "availability_read" ON "public"."worker_availability" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "booking_events_party_or_admin_read" ON "public"."booking_status_events" FOR SELECT TO "authenticated" USING ("public"."is_booking_party"("booking_id"));



ALTER TABLE "public"."booking_status_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookings_party_or_admin_read" ON "public"."bookings" FOR SELECT TO "authenticated" USING ("public"."is_booking_party"("id"));



ALTER TABLE "public"."cancellations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cancellations_party_or_admin_read" ON "public"."cancellations" FOR SELECT TO "authenticated" USING ("public"."is_booking_party"("booking_id"));



ALTER TABLE "public"."cash_confirmations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_public_read" ON "public"."service_categories" FOR SELECT TO "authenticated", "anon" USING (("is_active" OR "public"."is_admin"(false)));



CREATE POLICY "confirmations_party_or_admin_read" ON "public"."cash_confirmations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."payments" "p"
  WHERE (("p"."id" = "cash_confirmations"."payment_id") AND "public"."is_booking_party"("p"."booking_id")))));



ALTER TABLE "public"."content_pages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_published_read" ON "public"."content_pages" FOR SELECT TO "authenticated", "anon" USING ((("published_at" IS NOT NULL) OR "public"."is_admin"(false)));



ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_member_read" ON "public"."conversations" FOR SELECT TO "authenticated" USING ("public"."is_conversation_participant"("id"));



CREATE POLICY "exports_admin_read" ON "public"."report_exports" FOR SELECT TO "authenticated" USING ("public"."is_admin"(true));



ALTER TABLE "public"."favorites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "favorites_owner_read" ON "public"."favorites" FOR SELECT TO "authenticated" USING (("user_account_id" = "auth"."uid"()));



CREATE POLICY "favorites_owner_write" ON "public"."favorites" TO "authenticated" USING (("user_account_id" = "auth"."uid"())) WITH CHECK (("user_account_id" = "auth"."uid"()));



ALTER TABLE "public"."job_failures" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_failures_admin_read" ON "public"."job_failures" FOR SELECT TO "authenticated" USING ("public"."is_admin"(true));



ALTER TABLE "public"."location_updates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "locations_party_or_admin_read" ON "public"."location_updates" FOR SELECT TO "authenticated" USING ("public"."is_booking_party"("booking_id"));



ALTER TABLE "public"."match_candidates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "matches_authorized_read" ON "public"."match_candidates" FOR SELECT TO "authenticated" USING ((("worker_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."service_requests" "r"
  WHERE (("r"."id" = "match_candidates"."service_request_id") AND ("r"."user_account_id" = "auth"."uid"())))) OR "public"."is_admin"(false)));



ALTER TABLE "public"."message_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_member_insert" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = "auth"."uid"()) AND "public"."is_conversation_participant"("conversation_id")));



CREATE POLICY "messages_member_read" ON "public"."messages" FOR SELECT TO "authenticated" USING ("public"."is_conversation_participant"("conversation_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_recipient_read" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((("recipient_id" = "auth"."uid"()) OR ("audience" = 'EVERYONE'::"public"."notification_audience") OR (("audience" = 'USERS'::"public"."notification_audience") AND ("public"."current_role"() = 'USER'::"public"."account_role")) OR (("audience" = 'WORKERS'::"public"."notification_audience") AND ("public"."current_role"() = 'WORKER'::"public"."account_role")) OR "public"."is_admin"(false)));



CREATE POLICY "notifications_recipient_update" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("recipient_id" = "auth"."uid"())) WITH CHECK (("recipient_id" = "auth"."uid"()));



CREATE POLICY "participants_member_read" ON "public"."conversation_participants" FOR SELECT TO "authenticated" USING ("public"."is_conversation_participant"("conversation_id"));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_party_or_admin_read" ON "public"."payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."id" = "payments"."booking_id") AND "public"."is_booking_party"("b"."id")))));



ALTER TABLE "public"."receipts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "receipts_party_or_admin_read" ON "public"."receipts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."payments" "p"
  WHERE (("p"."id" = "receipts"."payment_id") AND "public"."is_booking_party"("p"."booking_id")))));



ALTER TABLE "public"."refunds" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "refunds_party_or_admin_read" ON "public"."refunds" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."payments" "p"
  WHERE (("p"."id" = "refunds"."payment_id") AND "public"."is_booking_party"("p"."booking_id")))));



ALTER TABLE "public"."report_exports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."request_media" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "request_media_authorized_read" ON "public"."request_media" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."service_requests" "r"
  WHERE (("r"."id" = "request_media"."service_request_id") AND (("r"."user_account_id" = "auth"."uid"()) OR ("r"."selected_worker_id" = "auth"."uid"()))))) OR "public"."is_admin"(false)));



CREATE POLICY "requests_authorized_read" ON "public"."service_requests" FOR SELECT TO "authenticated" USING ((("user_account_id" = "auth"."uid"()) OR ("selected_worker_id" = "auth"."uid"()) OR "public"."is_admin"(false)));



ALTER TABLE "public"."review_media" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "review_media_visible_read" ON "public"."review_media" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."id" = "review_media"."review_id") AND (("r"."moderation_status" = 'PUBLISHED'::"public"."review_moderation_status") OR ("r"."user_account_id" = "auth"."uid"()) OR ("r"."worker_account_id" = "auth"."uid"()))))) OR "public"."is_admin"(false)));



ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviews_visible_read" ON "public"."reviews" FOR SELECT TO "authenticated" USING ((("moderation_status" = 'PUBLISHED'::"public"."review_moderation_status") OR ("user_account_id" = "auth"."uid"()) OR ("worker_account_id" = "auth"."uid"()) OR "public"."is_admin"(false)));



CREATE POLICY "role_memberships_owner_or_admin_read" ON "public"."account_role_memberships" FOR SELECT TO "authenticated" USING ((("account_id" = "auth"."uid"()) OR "public"."is_admin"(true)));



ALTER TABLE "public"."service_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "settings_admin_read" ON "public"."system_settings" FOR SELECT TO "authenticated" USING ("public"."is_admin"(false));



CREATE POLICY "skills_owner_write" ON "public"."worker_skills" TO "authenticated" USING (("worker_id" = "auth"."uid"())) WITH CHECK (("worker_id" = "auth"."uid"()));



CREATE POLICY "skills_read" ON "public"."worker_skills" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tickets_owner_insert" ON "public"."support_tickets" FOR INSERT TO "authenticated" WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "tickets_owner_or_admin_read" ON "public"."support_tickets" FOR SELECT TO "authenticated" USING ((("owner_id" = "auth"."uid"()) OR "public"."is_admin"(false)));



CREATE POLICY "translations_member_read" ON "public"."message_translations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."messages" "m"
  WHERE (("m"."id" = "message_translations"."message_id") AND "public"."is_conversation_participant"("m"."conversation_id")))));



CREATE POLICY "trash_admin_read" ON "public"."trash_entries" FOR SELECT TO "authenticated" USING ("public"."is_admin"(true));



ALTER TABLE "public"."trash_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profile_self_or_admin_read" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING ((("account_id" = "auth"."uid"()) OR "public"."is_admin"(false)));



CREATE POLICY "user_profile_self_update" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("account_id" = "auth"."uid"())) WITH CHECK (("account_id" = "auth"."uid"()));



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "verification_owner_insert" ON "public"."worker_verifications" FOR INSERT TO "authenticated" WITH CHECK ((("worker_id" = "auth"."uid"()) AND ("public"."current_role"() = 'WORKER'::"public"."account_role") AND ("status" = 'PENDING'::"public"."worker_approval_status")));



CREATE POLICY "verification_owner_or_admin_read" ON "public"."worker_verifications" FOR SELECT TO "authenticated" USING ((("worker_id" = "auth"."uid"()) OR "public"."is_admin"(false)));



CREATE POLICY "verification_owner_pending_update" ON "public"."worker_verifications" FOR UPDATE TO "authenticated" USING ((("worker_id" = "auth"."uid"()) AND ("status" = ANY (ARRAY['PENDING'::"public"."worker_approval_status", 'NEEDS_DOCUMENTS'::"public"."worker_approval_status"])))) WITH CHECK ((("worker_id" = "auth"."uid"()) AND ("status" = ANY (ARRAY['PENDING'::"public"."worker_approval_status", 'NEEDS_DOCUMENTS'::"public"."worker_approval_status"]))));



ALTER TABLE "public"."worker_availability" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "worker_profile_discovery_read" ON "public"."worker_profiles" FOR SELECT TO "authenticated" USING ((("approval_status" = 'APPROVED'::"public"."worker_approval_status") OR ("account_id" = "auth"."uid"()) OR "public"."is_admin"(false)));



CREATE POLICY "worker_profile_self_update" ON "public"."worker_profiles" FOR UPDATE TO "authenticated" USING (("account_id" = "auth"."uid"())) WITH CHECK ((("account_id" = "auth"."uid"()) AND (("approval_status" = 'APPROVED'::"public"."worker_approval_status") OR (NOT "is_available"))));



ALTER TABLE "public"."worker_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."worker_skills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."worker_verifications" ENABLE ROW LEVEL SECURITY;


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO "anon";
GRANT ALL ON SCHEMA "public" TO "authenticated";
GRANT ALL ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "private"."make_location"("p_latitude" numeric, "p_longitude" numeric) FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."activate_confirmed_account"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."activate_confirmed_account"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_bootstrap_status"("email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_bootstrap_status"("email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_delete_account"("p_account_id" "uuid", "p_confirmation_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_delete_account"("p_account_id" "uuid", "p_confirmation_email" "text") TO "authenticated";



GRANT SELECT ON TABLE "public"."system_settings" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_set_setting"("setting_key" "text", "setting_value" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_set_setting"("setting_key" "text", "setting_value" "jsonb") TO "authenticated";



GRANT SELECT ON TABLE "public"."content_pages" TO "anon";
GRANT SELECT ON TABLE "public"."content_pages" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_upsert_content"("content_key" "public"."content_key", "title" "text", "body" "text", "version" "text", "publish" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_upsert_content"("content_key" "public"."content_key", "title" "text", "body" "text", "version" "text", "publish" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."archive_job"("queue_name" "text", "message_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_job"("queue_name" "text", "message_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."broadcast_application_change"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."cancel_admin_bootstrap"("email" "text", "token_hash" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_admin_bootstrap"("email" "text", "token_hash" "text") TO "service_role";



GRANT SELECT ON TABLE "public"."payments" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."confirm_cash_payment"("p_booking_id" "uuid", "p_idempotency_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."confirm_cash_payment"("p_booking_id" "uuid", "p_idempotency_key" "text") TO "authenticated";



GRANT SELECT ON TABLE "public"."reviews" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_review"("p_booking_id" "uuid", "stars" integer, "body" "text", "recommend_worker" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_review"("p_booking_id" "uuid", "stars" integer, "body" "text", "recommend_worker" boolean) TO "authenticated";



GRANT SELECT ON TABLE "public"."service_requests" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_service_request"("category_id" "uuid", "address_id" "uuid", "description" "text", "scheduled_at" timestamp with time zone, "budget" numeric, "notes" "text", "ai_analysis_id" "uuid", "notify_on_match" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_service_request"("category_id" "uuid", "address_id" "uuid", "description" "text", "scheduled_at" timestamp with time zone, "budget" numeric, "notes" "text", "ai_analysis_id" "uuid", "notify_on_match" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_role"() TO "anon";



GRANT SELECT ON TABLE "public"."refunds" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."decide_refund"("p_refund_id" "uuid", "p_decision" "public"."refund_status", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."decide_refund"("p_refund_id" "uuid", "p_decision" "public"."refund_status", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."enable_secondary_role"("p_role" "public"."account_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enable_secondary_role"("p_role" "public"."account_role") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."expire_booking_request"("target_booking" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."expire_booking_request"("target_booking" "uuid") TO "service_role";



GRANT SELECT ON TABLE "public"."match_candidates" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."generate_matches"("p_service_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_matches"("p_service_request_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_booking_tracking"("p_booking_id" "uuid", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_booking_tracking"("p_booking_id" "uuid", "p_limit" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_my_role_context"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_role_context"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_admin"("require_aal2" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"("require_aal2" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("require_aal2" boolean) TO "anon";



REVOKE ALL ON FUNCTION "public"."is_booking_party"("target_booking" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_booking_party"("target_booking" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_conversation_participant"("target_conversation" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_conversation_participant"("target_conversation" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."moderate_review"("review_id" "uuid", "decision" "public"."review_moderation_status") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."moderate_review"("review_id" "uuid", "decision" "public"."review_moderation_status") TO "authenticated";



GRANT SELECT ON TABLE "public"."trash_entries" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."move_to_trash"("entity_type" "text", "entity_id" "text", "snapshot" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."move_to_trash"("entity_type" "text", "entity_id" "text", "snapshot" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."permanently_delete"("trash_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."permanently_delete"("trash_id" "uuid") TO "authenticated";



GRANT SELECT ON TABLE "public"."ai_analyses" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."persist_ai_analysis"("p_account_id" "uuid", "p_input_type" "text", "p_input_storage_path" "text", "p_transcript" "text", "p_idempotency_key" "text", "p_provider" "text", "p_model" "text", "p_provider_reference" "text", "p_result" "jsonb", "p_attempts" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."persist_ai_analysis"("p_account_id" "uuid", "p_input_type" "text", "p_input_storage_path" "text", "p_transcript" "text", "p_idempotency_key" "text", "p_provider" "text", "p_model" "text", "p_provider_reference" "text", "p_result" "jsonb", "p_attempts" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."prepare_admin_bootstrap"("email" "text", "token_hash" "text", "display_name" "text", "expires_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prepare_admin_bootstrap"("email" "text", "token_hash" "text", "display_name" "text", "expires_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."prevent_account_security_changes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prevent_account_security_changes"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."provision_account"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."provision_account"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."read_job_batch"("queue_name" "text", "visibility_seconds" integer, "batch_size" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."read_job_batch"("queue_name" "text", "visibility_seconds" integer, "batch_size" integer) TO "service_role";



GRANT SELECT ON TABLE "public"."location_updates" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."record_worker_location"("booking_id" "uuid", "latitude" numeric, "longitude" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_worker_location"("booking_id" "uuid", "latitude" numeric, "longitude" numeric) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."restore_from_trash"("trash_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restore_from_trash"("trash_id" "uuid") TO "authenticated";



GRANT SELECT,INSERT ON TABLE "public"."worker_verifications" TO "authenticated";



GRANT UPDATE("identity_data") ON TABLE "public"."worker_verifications" TO "authenticated";



GRANT UPDATE("document_paths") ON TABLE "public"."worker_verifications" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."review_worker_verification"("verification_id" "uuid", "decision" "public"."worker_approval_status", "notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."review_worker_verification"("verification_id" "uuid", "decision" "public"."worker_approval_status", "notes" "text") TO "authenticated";



GRANT SELECT ON TABLE "public"."bookings" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."select_worker"("p_service_request_id" "uuid", "p_worker_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."select_worker"("p_service_request_id" "uuid", "p_worker_id" "uuid") TO "authenticated";



GRANT SELECT ON TABLE "public"."accounts" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_account_status"("account_id" "uuid", "next_status" "public"."account_status") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_account_status"("account_id" "uuid", "next_status" "public"."account_status") TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."addresses" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_address_location"("p_address_id" "uuid", "p_latitude" numeric, "p_longitude" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_address_location"("p_address_id" "uuid", "p_latitude" numeric, "p_longitude" numeric) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_admin_mfa_enabled"("enabled" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_admin_mfa_enabled"("enabled" boolean) TO "authenticated";



GRANT SELECT ON TABLE "public"."worker_profiles" TO "authenticated";



GRANT UPDATE("display_name") ON TABLE "public"."worker_profiles" TO "authenticated";



GRANT UPDATE("avatar_path") ON TABLE "public"."worker_profiles" TO "authenticated";



GRANT UPDATE("bio") ON TABLE "public"."worker_profiles" TO "authenticated";



GRANT UPDATE("experience") ON TABLE "public"."worker_profiles" TO "authenticated";



GRANT UPDATE("service_area") ON TABLE "public"."worker_profiles" TO "authenticated";



GRANT UPDATE("is_available") ON TABLE "public"."worker_profiles" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_recommendation_priority"("worker_id" "uuid", "enabled" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_recommendation_priority"("worker_id" "uuid", "enabled" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_worker_service_area"("p_latitude" numeric, "p_longitude" numeric, "p_radius_meters" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_worker_service_area"("p_latitude" numeric, "p_longitude" numeric, "p_radius_meters" integer) TO "authenticated";



GRANT SELECT ON TABLE "public"."conversations" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."start_worker_conversation"("p_service_request_id" "uuid", "p_worker_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."start_worker_conversation"("p_service_request_id" "uuid", "p_worker_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."switch_active_role"("p_role" "public"."account_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."switch_active_role"("p_role" "public"."account_role") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."transition_booking"("p_booking_id" "uuid", "p_target_status" "public"."booking_status", "p_expected_version" integer, "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_booking"("p_booking_id" "uuid", "p_target_status" "public"."booking_status", "p_expected_version" integer, "p_reason" "text") TO "authenticated";



GRANT SELECT,INSERT ON TABLE "public"."support_tickets" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_support_ticket"("p_ticket_id" "uuid", "p_next_status" "public"."ticket_status", "p_resolution" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_support_ticket"("p_ticket_id" "uuid", "p_next_status" "public"."ticket_status", "p_resolution" "text") TO "authenticated";



GRANT SELECT ON TABLE "public"."account_role_memberships" TO "authenticated";



GRANT SELECT ON TABLE "public"."admin_profiles" TO "authenticated";



GRANT SELECT ON TABLE "public"."ai_analysis_attempts" TO "authenticated";



GRANT SELECT ON TABLE "public"."audit_logs" TO "authenticated";



GRANT SELECT ON TABLE "public"."booking_status_events" TO "authenticated";



GRANT SELECT ON TABLE "public"."cancellations" TO "authenticated";



GRANT SELECT ON TABLE "public"."cash_confirmations" TO "authenticated";



GRANT SELECT ON TABLE "public"."conversation_participants" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."favorites" TO "authenticated";



GRANT SELECT ON TABLE "public"."job_failures" TO "authenticated";



GRANT SELECT,INSERT ON TABLE "public"."message_attachments" TO "authenticated";



GRANT SELECT ON TABLE "public"."message_translations" TO "authenticated";



GRANT SELECT,INSERT ON TABLE "public"."messages" TO "authenticated";



GRANT SELECT ON TABLE "public"."notifications" TO "authenticated";



GRANT UPDATE("read_at") ON TABLE "public"."notifications" TO "authenticated";



GRANT SELECT ON TABLE "public"."receipts" TO "authenticated";



GRANT SELECT ON TABLE "public"."report_exports" TO "authenticated";



GRANT SELECT ON TABLE "public"."request_media" TO "authenticated";



GRANT SELECT ON TABLE "public"."review_media" TO "authenticated";



GRANT SELECT ON TABLE "public"."service_categories" TO "anon";
GRANT SELECT ON TABLE "public"."service_categories" TO "authenticated";



GRANT SELECT ON TABLE "public"."user_profiles" TO "authenticated";



GRANT UPDATE("display_name") ON TABLE "public"."user_profiles" TO "authenticated";



GRANT UPDATE("avatar_path") ON TABLE "public"."user_profiles" TO "authenticated";



GRANT UPDATE("notification_preferences") ON TABLE "public"."user_profiles" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."worker_availability" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."worker_skills" TO "authenticated";



