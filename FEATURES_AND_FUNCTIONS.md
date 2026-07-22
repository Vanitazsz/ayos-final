# Features and Functions

| Feature | Purpose and frontend location | Backend/tables | Endpoint/RPC | Permission/validation/dependencies |
| --- | --- | --- | --- | --- |
| Email Auth | Auth screens in Expo; admin login | Supabase Auth, `accounts`, profiles, memberships/session roles | Supabase Auth APIs, `get_my_role_context` | Valid email/password; active account; protected routes |
| Google OAuth | Expo/web login button/callback | Supabase Auth identities, provisioning trigger | `signInWithOAuth`, PKCE callback | Customer role only; missing Google credentials block activation |
| Recovery | Forgot/reset/OTP routes | Supabase Auth recovery tokens | `resetPasswordForEmail`, `updateUser` | Redirect allowlist; no fixed OTP |
| Role switching | Customer/worker profile/settings | `account_role_memberships`, `account_session_roles` | `enable_secondary_role`, `switch_active_role` | Active membership; no route-only switch |
| Catalog | Home, request form, services admin | `service_categories`, `industries`, `skills`, `services`, `worker_offerings` | PostgREST, `admin_upsert_category`, `admin_upsert_service` | Active rows; bounded prices/duration; AAL2 admin writes |
| Worker registration | `register-worker`, verification | `worker_profiles`, `worker_skills`, `worker_verifications` | `submit_worker_application`, Storage | Live taxonomy; UUID-owned documents; MIME/size validation |
| Worker approval | Admin workers | verification/profile/accounts/audit | `review_worker_verification` | ADMIN+AAL2; pending transition |
| Geocoding | Location picker/request form | `geocoding_cache`, `addresses` | `geocode-search`, `geocode-reverse`, `save_geocoded_address` | Auth, 3+ chars, PH bounds, rate limit, ORS secret |
| Maps/routes | Matching, booking, tracking | PostGIS locations, `route_snapshots` | `route` | Participants/admin; `[lon,lat]`; MapLibre style |
| Request creation | New-request routes | `service_requests`, addresses, request media | `create_service_request` | Customer, published Terms, 10–4000 chars, future schedule, positive budget |
| AI consent/job | Create/issue-summary | `ai_processing_consents`, `ai_analysis_jobs`, attempts, `ai_analyses` | `ai-analyze-request`, `ai-process-job`, `persist_ai_analysis` | Per-request versioned consent; JWT; owner media; feature/quota gate |
| AI translation | Chat | `message_translations` | `ai-translate-message` | Conversation participant; differing locale; cached original preserved |
| Review insights | Admin reviews/analytics | `review_ai_insights` | `ai-review-insights` | Admin; advisory only; human moderation |
| Provider health | Admin settings | AI attempt history/settings | `ai-provider-health` | Administrator read |
| Deterministic matching | Matching/request details | `match_candidates`, worker skills/availability/bookings/reviews | `generate_matches` | Request owner; verified compatibility, PostGIS radius, auditable factors |
| Bids | Worker jobs/customer request | `request_bids` | `submit_request_bid`, `withdraw_request_bid` | Approved worker; valid open request, amount/duration/message bounds |
| Worker selection | Customer applicants/matching | requests, candidates/bids, bookings, conversations | `select_worker` | Request owner; eligible available worker; transactional |
| Booking lifecycle | Worker booking/customer tracking | `bookings`, `booking_status_events` | booking transition RPCs | Booking participant; expected state/version; reason when required |
| Tracking/ETA | Tracking screens | worker location updates, addresses, snapshots | `get_booking_tracking`, `route` | Participants/admin; authorized latest worker point |
| Chat | Customer/worker messages | conversations, participants, messages, attachments/translations | PostgREST/RPC/Realtime | Participants only; non-empty message; private attachments |
| Cash payment | Payment screens | `payments`, `receipts`, wallet trigger/ledger | `confirm_cash_payment` | Booking party/state; idempotency; cash only active |
| Wallet/payout | Worker wallet/transactions | `wallets`, `wallet_transactions`, `payout_methods`, `payout_requests` | `request_payout`, `admin_decide_payout` | Owner balance/method; append-only; AAL2 decision |
| Reviews/media | Review/provider/admin pages | reviews, media, votes, reports, replies, insights | `create_review`, `attach_review_media`, `set_review_vote`, `moderate_review` | Completed booking/participant; rating/body/media bounds; admin moderation |
| Cancellations | Booking cancellation routes | bookings/events, `cancellation_reasons` | transition/cancel RPC | Party-specific reason; state rules |
| Notifications | Notification screens/admin campaigns | notifications, campaigns/deliveries | `mark_notification_read`, `admin_publish_campaign` | Owner/admin; draft/publish transitions |
| Support | Admin support and conduct reports | tickets, messages, attachments | PostgREST, `update_support_ticket` | Owner/admin; bounded subject/body; private files |
| Dashboard/analytics | Admin dashboard/analytics | aggregate views/tables | `admin_dashboard_metrics`, PostgREST aggregates | Administrator |
| Reports | Admin Reports | `report_exports`, private Storage | `report-generate` | ADMIN+AAL2; type/format allowlists; 10k-row bound |
| Settings | Admin settings | `system_settings` | `admin_set_setting` | ADMIN+AAL2; typed JSON values |
| Audit/recovery | Admin audit/trash | `audit_logs`, `trash_entries` | restore/permanent-delete RPCs | Administrator; protected-account rules |

Unavailable integrations—GCash/card, SMS, Apple/X, and push—are disabled and never return fabricated success. AI and Google code paths remain gated by missing production credentials/evaluation described in `PROJECT_PHASES.md`.
## Real profiles

| Feature | Frontend integration | Backend/storage | Authorization |
|---|---|---|---|
| Current profile | Customer, worker, and admin profile headers | `get_my_profile()` | Authenticated owner |
| Profile completion/update | Customer profile form and admin personal-information form | `complete_my_profile()`, `update_my_profile()` | Authenticated owner |
| Avatar | Existing profile photo controls | `profile-avatars`, `set_my_avatar()` | Owner write; authenticated read |
| Worker portfolio | Worker profile service model | `worker_portfolio_media`, `worker-portfolio` | Worker/admin write; authorized read |
| Login activity | Administrator Profile | `authentication_events`, `record-auth-session` | Owner/admin read; server insert |
| Conversation unread count | Messages list/chat | `conversation_reads`, `mark_conversation_read()` | Conversation participant |
| Support ownership/assignment | Administrator Support | persisted category, priority, assignee and messages | Participant/admin policies |
