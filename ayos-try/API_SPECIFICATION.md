# API Specification

## Contract conventions

The clients use Supabase Auth, PostgREST, PostgreSQL RPC, Storage, Realtime, and Edge Functions. RLS applies to all direct reads. Sensitive mutations use authenticated RPCs or Edge Functions. Database errors use stable domain codes; Edge Functions return JSON with an error code/message and an appropriate HTTP status. No endpoint returns a fictional identity or simulated success.

All Edge Function requests use `Authorization: Bearer <access-token>` unless explicitly documented by the function as a protected service/queue invocation. JSON requests use `Content-Type: application/json`. IDs are UUIDs and money is represented in PHP minor units.

## Edge Functions

| Function               | Method/body                                                            | Purpose and response                                                                                       | Authorization and validation                                                     |
| ---------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `record-auth-session`  | `POST {}`                                                              | Records the current application login event using server-derived request metadata                          | Authenticated account only                                                       |
| `ai-analyze-request`   | `POST` request text/media references, consent version, idempotency key | Creates or returns an `ai_analysis_jobs` row; `202` while queued                                           | Active owner, explicit consent, media ownership/type/size, quota and idempotency |
| `ai-process-job`       | `POST` queued job reference                                            | Runs Gemini and eligible OpenAI fallback, validates structured output, persists analysis and attempt audit | Protected worker invocation; job ownership/state enforced                        |
| `geocode-search`       | `GET ?q=<query>&lat=<latitude>&lon=<longitude>`                        | Returns up to 5 normalized Philippine address candidates by default                                        | Authenticated; 3–200 character query, result cap, rate limit, cache              |
| `geocode-reverse`      | `GET ?lat=<latitude>&lon=<longitude>`                                  | Returns a normalized address for a Philippine coordinate                                                   | Authenticated; coordinate bounds and cache                                       |
| `route`                | `POST` origin/destination coordinates                                  | Returns GeoJSON, meters, seconds, and persisted route metadata                                             | Authenticated booking/request participant; `[longitude, latitude]` ordering      |
| `report-export`        | `POST` report type/filter/format                                       | Generates CSV/XLSX/PDF, stores it privately, and returns export metadata                                   | Administrator/AAL2 where required; bounded filters                               |
| `admin-invite-account` | `POST` email/name/role                                                 | Sends a real Supabase invitation                                                                           | AAL2 Administrator; role allowlist and duplicate checks                          |
| `queue-consumer`       | `POST` queue invocation                                                | Claims, executes, retries, and archives background work                                                    | Shared-secret/service invocation only                                            |

Example queued AI request:

```json
{
  "description": "The kitchen sink leaks below the trap.",
  "mediaPaths": [],
  "consentVersion": "2026-07-22",
  "idempotencyKey": "9e8cdd18-2639-4f12-b5c5-a2143bd1af25"
}
```

Example accepted response:

```json
{
  "success": true,
  "data": {
    "jobId": "0d937deb-d0e6-451a-9b41-63716f43522e",
    "status": "QUEUED"
  }
}
```

## PostgreSQL RPC groups

### Industry catalog

`GET /rest/v1/industries?is_active=eq.true&select=id,slug,name,sort_order,service_categories(id,slug,name,is_active)` is available to anonymous and authenticated registration clients through RLS. Results are ordered by `sort_order`; clients expose only active nested skills and never submit custom labels.

`submit_worker_application` retains its JSONB interface. `identityData.industryId` is an active industry UUID and `identityData.skillIds` contains 1–10 distinct active category UUIDs belonging to that industry. Invalid, inactive, duplicate, custom, or cross-industry values return `INVALID_WORKER_ONBOARDING` or `INVALID_WORKER_SKILLS` and no partial records are committed.

Hosted verification on 2026-07-22 returned 10 active industries with five active skills each. Cleaning, Electrical, and Plumbing retained their pre-migration UUIDs.

### Published customer content

`GET /rest/v1/content_pages?key=eq.{HELP_CENTER|PRIVACY}&published_at=not.is.null&select=title,body,version,updated_at` returns the published customer Help Center or Privacy Policy through the existing content-page RLS policy. The mobile service maps the row to `ContentPageViewModel`; no row returns the unavailable state, and query failure returns the retry state. Content remains administrator-managed and is not embedded in the Profile component.

The SQL migration containing each function is the executable request/response authority. Literal frontend calls are checked by `pnpm contracts:check`.

| Group                      | RPCs                                                                                                                                                                                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profiles and roles         | `get_my_profile`, `update_my_profile`, `complete_my_profile`, `set_my_avatar`, `record_my_password_change`; `accounts.role` is immutable and authoritative                                                                                                                                      |
| Addresses and geospatial   | `upsert_my_address`, `set_address_location`, `save_geocoded_address`, `snapshot_request_address`, `record_worker_location`, `get_booking_tracking`                                                                                                                                              |
| Catalog and worker         | Active `industries`/`service_categories` reads; `admin_upsert_category`, `admin_upsert_service`, `admin_set_worker_availability`, `submit_worker_application`, `submit_worker_onboarding_identity`, `submit_verification_document`, `review_worker_verification`, `set_recommendation_priority` |
| Requests and matching      | `create_service_request`, `attach_request_media`, `generate_matches`, `submit_request_bid`, `submit_service_offer`, `withdraw_service_offer`, `select_worker`, `accept_service_offer`                                                                                                           |
| Booking and payment        | `transition_booking`, `cancel_booking`, `get_booking_payment`, `confirm_cash_payment`, `decide_refund`                                                                                                                                                                                          |
| Wallet and payout          | `get_my_wallet_summary`, `submit_manual_wallet_topup`, `admin_review_wallet_topup`, `upsert_payout_destination`, `request_payout`, `admin_decide_payout`                                                                                                                                        |
| Messages and notifications | `start_worker_conversation`, `mark_conversation_read`, `mark_notification_read`, `admin_create_notification_draft`, `admin_publish_campaign`, `admin_send_notification_now`, `admin_archive_notification`                                                                                       |
| Support and reviews        | `create_support_ticket`, `send_support_message`, `update_support_ticket`, `create_review`, `moderate_review`, media attachment RPCs                                                                                                                                                             |
| AI                         | `persist_ai_analysis`, `save_ai_analysis`                                                                                                                                                                                                                                                       |
| Administration             | `get_admin_dashboard_metrics`, `set_account_status`, `admin_delete_account`, content/settings/promotion/service commands, report/trash/restore commands, bootstrap/session/MFA commands                                                                                                         |

RPC example:

```ts
const { data, error } = await supabase.rpc('get_my_profile');
if (error) throw error;
```

Common statuses are `200` for successful reads/commands, `201` for created resources, `202` for queued jobs, `400` for invalid input, `401` for missing/invalid authentication, `403` for role/ownership/AAL failure, `404` for an inaccessible resource, `409` for idempotency/version/state conflicts, `422` for a valid request that violates a domain rule, `429` for quotas/rate limits, and `500`/`502`/`503` for internal or provider failure. RLS can intentionally make unauthorized resources appear absent.

## Storage and Realtime

Clients upload only to private workflow buckets and UUID-prefixed paths. Database/RPC ownership is established before uploads are committed. Realtime subscriptions follow authorized account, booking, conversation, notification, and AI-job rows; Realtime is a delivery mechanism, not an authorization bypass.

## Unverified production behavior

Google OAuth, Gemini, OpenAI fallback, OpenRouteService, SMTP, push delivery, and hosted callbacks were not exercised during the local merge. **Insufficient data to verify.**
