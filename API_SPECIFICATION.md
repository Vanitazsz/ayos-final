# API Specification

## Conventions

Base URL: `https://qsurouiyvisykjkgjqmz.supabase.co/functions/v1`

All deployed Edge Functions require:

```http
Authorization: Bearer <supabase-access-token>
apikey: <publishable-key>
Content-Type: application/json
```

Success:

```json
{ "success": true, "message": "Request completed", "data": {} }
```

Application failure:

```json
{ "success": false, "code": "machine_code", "message": "Human-readable message", "errors": {} }
```

Common status codes: `200` success, `201` created, `202` queued, `400` malformed, `401` missing/invalid JWT, `403` role/owner denial, `404` unavailable entity, `409` state/idempotency conflict, `415` non-JSON, `422` validation, `429` quota/rate limit, `500` sanitized internal error, `503` disabled/provider unavailable.

## AI endpoints

### POST `/ai-analyze-request`

Queues an owned analysis job. It does not call a provider synchronously.

Headers: `idempotency-key` (16–128 characters). Authentication required.

```json
{
  "description": "The kitchen sink leaks below the cabinet when the tap runs.",
  "locale": "en-PH",
  "media": [
    {
      "bucket": "service-request-media",
      "path": "<auth-uuid>/request/photo.jpg",
      "contentType": "image/jpeg"
    }
  ],
  "consent": { "accepted": true, "version": "2026-07-21" }
}
```

Validation: active account, `ai.enabled`, current consent version, 10–4000 description characters, daily quota, idempotency, at most three images/one audio, and owner-prefixed paths. Returns `202` with an `ai_analysis_jobs` row. Duplicate owner/key returns the existing row with `200`.

Errors include `consent_required`, `consent_version_invalid`, `ai_disabled`, `ai_quota_exceeded`, and `invalid_idempotency_key`.

### POST `/ai-process-job`

Processes a queued/failed job owned by the caller.

```json
{ "jobId": "uuid" }
```

Returns the completed job row. The `result` contains:

```json
{
  "detectedIssue": "string",
  "possibleCauses": ["string"],
  "suggestedCategoryIds": ["uuid"],
  "suggestedServiceIds": ["uuid"],
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "urgency": "ROUTINE|SOON|URGENT|EMERGENCY",
  "estimatedDurationMinutes": 60,
  "estimatedCostMinimumMinor": 50000,
  "estimatedCostMaximumMinor": 150000,
  "safetyAdvice": ["string"],
  "followUpQuestions": ["string"],
  "confidence": 0.8,
  "requestDraft": "string",
  "transcript": "string",
  "safetyCritical": false,
  "costOutlier": false,
  "provider": "GEMINI|OPENAI",
  "model": "string",
  "providerReference": "string|null",
  "analysisId": "uuid"
}
```

Gemini receives two attempts only for retryable timeout/429/5xx/schema failure. OpenAI is called only after both retryable failures. Missing consent/auth, invalid media/input, and safety rejection do not trigger fallback. Failure persists a retryable/non-retryable job state and never returns fabricated analysis.

### POST `/ai-translate-message`

```json
{ "messageId": "uuid", "targetLocale": "tl-PH" }
```

Caller must be a conversation participant. If original locale already matches, the original is returned. Otherwise an existing `(message,target_locale)` cache row is returned or a new translation is stored. The original message is unchanged.

### POST `/ai-review-insights`

Administrator-only advisory sentiment analysis.

```json
{ "reviewId": "uuid" }
```

Returns/stores sentiment, topics, risk flags, confidence, provider/model/reference. It cannot alter `moderation_status`.

### GET `/ai-provider-health`

Administrator-only. Returns configured flags/model labels and 24-hour attempts, successes, success rate, average latency, last error, and fallback policy. It never exposes keys.

### Any `/ai-recommendation`

Authenticated legacy endpoint. Returns `410 endpoint_replaced`. Use the queue/process workflow.

## Geocoding endpoints

### GET `/geocode-search?q=<text>&limit=5&lat=<latitude>&lon=<longitude>`

Authentication required. Query length 3–200; limit 1–10. Focus defaults to Manila, country is restricted to `PH`, results outside Philippine bounds are dropped, and normalized query/focus/limit is cached.

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "line": "string",
        "barangay": "string|null",
        "city": "string|null",
        "province": "string|null",
        "postalCode": "string|null",
        "displayLabel": "string",
        "confidence": 0.9,
        "longitude": 120.9842,
        "latitude": 14.5995,
        "providerId": "string"
      }
    ],
    "cached": false,
    "attribution": "© OpenStreetMap contributors, OpenRouteService"
  }
}
```

### GET `/geocode-reverse?lat=<latitude>&lon=<longitude>`

Authentication required. Coordinates must be finite and within Philippine bounds. The result uses the same normalized address model and a coordinate-rounded cache key. Missing barangay/postal fields are permitted.

### POST `/route`

```json
{
  "start": [120.9842, 14.5995],
  "end": [121.0244, 14.5547],
  "bookingId": "optional-uuid"
}
```

Coordinates are `[longitude, latitude]`; both points must be in the Philippines. If `bookingId` is present, caller must be a booking party/admin. Returns route GeoJSON, `distanceMeters`, `durationSeconds`, `cached`, coordinate-order label, and attribution. Noncached booking routes are persisted in `route_snapshots`.

## Report endpoint

### POST `/report-generate`

Requires administrator AAL2.

```json
{
  "reportType": "FINANCIAL|WORKERS|CUSTOMERS|SERVICES|REVIEWS",
  "format": "CSV|XLSX|PDF",
  "filters": {}
}
```

Creates a `report_exports` row, reads at most 10,000 rows from the allowed source, generates the file, uploads `<admin-uuid>/<export-uuid>.<extension>` to private `report-exports`, and returns a COMPLETED row (`201`). Failure persists FAILED with a reason. Clients create a short-lived signed download URL.

## Compatibility API

The following endpoints are under `/api`. All require authentication; RLS determines visible rows.

### GET `/api/health`

Returns authenticated readiness and project reference.

### GET `/api/me`

Returns current account/profile/role context. Suspended/deleted navigation is rejected by client/account checks.

### GET `/api/categories?page=1&limit=20`

Active service categories plus service count and pagination metadata.

### GET `/api/services?page=1&limit=20&search=<text>&categoryId=<uuid>`

Active normalized services with optional escaped substring search/category filter.

### GET `/api/providers?page=1&limit=20`

Approved/available worker profiles with skills and offerings; request-specific distance/eligibility comes from matching, not this catalog call.

### GET `/api/requests?page=1&limit=20`

RLS-visible requests with category/address/bids.

### POST `/api/requests`

```json
{
  "categoryId": "uuid",
  "addressId": "uuid",
  "description": "10–4000 chars",
  "scheduledAt": "ISO-8601 future timestamp",
  "budget": 500,
  "notes": null,
  "aiAnalysisId": null,
  "notifyOnMatch": true
}
```

Calls `create_service_request`; requires customer role, owned geocoded address, published Terms, positive budget, and owned optional AI analysis. Returns `201`.

### GET `/api/bookings?page=1&limit=20`

RLS-visible bookings, requests, payments, and status events.

### POST `/api/bookings/{uuid}/transitions`

Compatibility transition request. Maintained Expo clients use the authoritative typed booking RPC wrappers directly.

### GET `/api/conversations?page=1&limit=20`

Current participant conversations/messages/attachments.

### POST `/api/conversations/{uuid}/messages`

```json
{ "text": "non-empty message", "locale": "en-PH" }
```

RLS requires participation; returns inserted message (`201`).

### GET `/api/notifications?page=1&limit=20`

Returns current recipient notifications.

### PATCH `/api/notifications/{uuid}/read`

Marks one owned notification read.

### GET `/api/admin/dashboard`

Administrator metrics via `admin_dashboard_metrics`.

### GET `/api/admin/{users|workers|bookings|payments|reviews|support|audit|settings|reports|ai-jobs}`

Administrator paginated operational rows. Maintained admin screens also use direct RLS/RPC service adapters.

## Transactional RPC contracts

RPCs are called through `supabase.rpc(name, parameters)`. Database errors use PostgreSQL codes/messages and are mapped by clients.

| RPC | Primary parameters | Result/rules |
| --- | --- | --- |
| `save_geocoded_address` | label/address parts/lat/lon/provider/confidence/payload/default | Owned address; PH bounds; text/point atomic |
| `create_service_request` | category/address/description/schedule/budget/notes/analysis/notify | Owned customer request; future schedule/published Terms |
| `generate_matches` | `p_service_request_id` | Up to five auditable eligible candidates; owner only |
| `submit_request_bid` | request/amount minor/message/duration | Approved worker/open request; one active bid |
| `withdraw_request_bid` | bid ID | Bid owner/submitted state |
| `select_worker` | request/worker | Request owner; eligible worker; booking+conversation transaction |
| Booking transitions | booking ID and required expected state/reason | Participant/state/version validation + event |
| `confirm_cash_payment` | booking/idempotency | Real cash result, receipt, one wallet credit |
| `create_review` | booking/stars/body/recommend | Customer/completed booking/one review |
| `attach_review_media` | review/path/type/bytes | Review owner/UUID private path/type/size |
| `set_review_vote` | review/helpful | One vote/account/review |
| `mark_notification_read` | notification ID | Recipient only |
| `submit_worker_application` | identity/doc paths/bio/experience | WORKER role, owner document paths |
| `request_payout` | method/amount minor/idempotency | Owner method/balance; wallet lock |
| `admin_decide_payout` | payout/decision/notes | ADMIN+AAL2; pending only |
| `admin_dashboard_metrics` | none | Administrator aggregate JSON |
| `admin_upsert_category/service` | validated catalog fields | ADMIN+AAL2 |
| `admin_set_worker_availability` | worker/boolean | ADMIN+AAL2 |
| `admin_publish_campaign` | campaign ID | ADMIN+AAL2; draft delivery materialization |

Generated table/type details are in `packages/client/src/database.types.ts`; database relationships and RLS are in `DATABASE_DESIGN.md`.

## Storage contracts

| Bucket | Private path | Allowed data |
| --- | --- | --- |
| `service-request-media` | `<auth-uuid>/...` | JPEG/PNG/WebP/HEIC, supported audio; max 15 MB/file |
| `review-media` | `<auth-uuid>/...` | Images; max 10 MB |
| `verification-documents` | `<auth-uuid>/...` | Images/PDF; max 15 MB |
| `chat-attachments` | `<auth-uuid>/...` | Images/PDF; max 15 MB |
| `support-attachments` | `<auth-uuid>/...` | Images/PDF; max 15 MB |
| `report-exports` | `<admin-uuid>/...` | CSV/XLSX/PDF; max 50 MB |

## Realtime channels

Clients subscribe to filtered changes for `ai_analysis_jobs`, `request_bids`, bookings/events, messages, notifications/deliveries, wallets/payouts, support messages, review insights, route snapshots, report exports, and relevant dashboard activity. RLS remains effective for Realtime delivery.
## Profile RPCs and function

| Interface | Input | Success data | Authentication |
|---|---|---|---|
| `get_my_profile()` | None | account, active role, role profile, default address, email/profile completion flags | Required |
| `update_my_profile(...)` | Display name, mobile and role-specific optional fields | Refreshed profile envelope | Owner |
| `complete_my_profile(...)` | Same as update | Refreshed profile with completion timestamp | Owner |
| `set_my_avatar(path)` | Owned Storage path or null | Refreshed profile envelope | Owner |
| `record_my_password_change()` | None, called only after Auth password update | Timestamp | Owner |
| `mark_conversation_read(uuid)` | Conversation ID | Read timestamp | Participant |
| `admin_update_support_details(...)` | Ticket, category, priority, assignee | Updated ticket | AAL2 administrator |
| `POST /functions/v1/record-auth-session` | Empty JSON object | Recorded/deduplicated authentication event | Required JWT |

Profile endpoints never return a fabricated identity. `PROFILE_NAME_REQUIRED`, `PROFILE_NOT_FOUND`, and integrity errors require completion or data repair.
