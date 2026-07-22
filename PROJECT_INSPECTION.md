# Project Inspection

## Inspected applications

| Application | Location | Role |
| --- | --- | --- |
| Administrator web | `/Users/jhonfiel/Downloads/A-yos-Project-main/admin-webapp` | Standalone React/Vite operations portal |
| Unified Expo app | `/Users/jhonfiel/Downloads/A-yos-Project-workerfrontend-refactor` | Customer and worker mobile/web client |
| Legacy customer copy | `/Users/jhonfiel/Downloads/A-yos-Project-main/newuserfrontend` | Inspected as source context; not the maintained unified client |

## Administrator pages and routes

- Login and protected administrator routing.
- Dashboard and activity.
- Users, workers/verification, bookings, payments, reviews, support, notifications/campaigns, audit logs, reports, trash/recovery, services/categories, settings, analytics, and profile.
- Shared administrator layout, navigation, command palette, drawers, modals, tables, badges, pagination, skeletons, and toasts.

All data pages now call Supabase/RPC/Edge services and subscribe to relevant tables. The former localStorage identity and hardcoded administrator login were removed. LocalStorage remains only for harmless presentation preferences such as sidebar state.

## Expo page groups

### Authentication

- Landing, login, signup, OTP/email verification, forgot/reset password, callback completion, and onboarding.
- Google OAuth via Supabase PKCE/deep links.
- Apple and X controls remain positioned but disabled/unavailable.

### Customer

- Home/catalog/providers, bookings, messages, profile, notifications.
- Provider detail, request detail/applicants/bids, booking, tracking, chat, payment/cash confirmation, review.
- Request creation, AI consent/analysis summary, urgency, ASAP, weekly scheduling, bidding, budget, radius, matching, and success/detail routes.

### Worker

- Dashboard, jobs, job detail/bid, bookings, booking lifecycle, cancellation, messages, profile, registration, verification, reviews, transactions, wallet/payouts, and settings/role switching.

## Forms, buttons, and modals

Inspected inputs include identity/profile, email/password, OTP/recovery, worker skills/experience/documents, request text/category/media/address/radius/budget/schedule, bids, booking transitions, cancellation reasons, chat, cash confirmation, reviews, payout requests, support replies, worker decisions, service/category edits, campaign creation, settings, and report generation.

Buttons and modal actions were traced to Supabase Auth, PostgREST, RPC, Storage, Realtime, Edge Functions, navigation, or an explicit unavailable state. Temporary IDs, fake delays, random activity, fixed OTPs, fake call success, simulated posting, and mock-array imports were removed from maintained production paths.

## Frontend data patterns

- Supabase JS is the client contract for Auth, PostgREST, RPC, Storage, Functions, and Realtime.
- Expo uses persistent AsyncStorage sessions and AppState-aware token refresh.
- Zustand remains the UI/auth/request projection layer.
- React Query remains the remote-state pattern where already present; service adapters map rows into approved view models.
- The administrator app uses a centralized real-data service and authenticated context.

## Authentication flow found and implemented

- Email/password login, signup, verification, recovery, refresh, logout.
- Database account provisioning trigger and role membership.
- Suspended/deleted status validation before protected navigation.
- Customer/worker role switching through RPC, not route-only simulation.
- Administrator routes require hosted ADMIN state; mutations require AAL2 in database functions.
- Google OAuth callback: `ayos://auth/callback`; iOS/Android identity: `com.ayos.app`.

## API/Edge calls

The clients use direct RLS-protected tables/RPCs for routine CRUD and transactional functions for state changes. Provider-secret operations use:

- `ai-analyze-request`, `ai-process-job`, `ai-translate-message`, `ai-review-insights`, `ai-provider-health`
- `geocode-search`, `geocode-reverse`, `route`
- `report-generate`
- compatibility `api`

Detailed contracts are in `API_SPECIFICATION.md`.

## Required database entities inferred

The hosted baseline already covered accounts, profiles, role memberships/session roles, categories, addresses, requests, candidates, bookings/events, conversations/messages/translations/attachments, payments/receipts/refunds, reviews/media, verification, notifications, support tickets, audit, reports, settings, content, and recovery.

Additive domains implemented: industries, skills, normalized services, worker offerings, bids, wallets/ledger, payout methods/requests, support messages/attachments, review votes/reports/replies/insights, campaigns/deliveries, cancellation reasons, AI consents/jobs/attempt metadata, geocoding cache, and route snapshots.

## Maps, uploads, notifications, search, filters, pagination, reports

- `react-native-maps` and placeholder grid maps were replaced with MapLibre native/web surfaces.
- Request/review/verification/chat/support/report buckets use private UUID-owned paths and MIME/size restrictions.
- Realtime subscriptions refresh chat, notifications, bids, bookings, AI jobs, wallets, support, reports, and dashboard activity.
- Administrator tables implement search/filter/pagination over real rows; backend bounds protect large reads.
- Reports generate real CSV/XLSX/PDF Storage objects.

## Technical debt and verified limitations

- Expo lint passes with warnings (unused legacy imports and hook-dependency warnings); no lint errors.
- Administrator build reports a large single bundle; route-level splitting is not implemented.
- Some approved controls represent externally unavailable integrations (GCash/card, Apple/X, SMS, push) and are disabled.
- Worker-to-customer free-form feedback and callable phone sharing are not represented in the authoritative schema; those controls do not fake success and route safety/conduct concerns to support.
- Google provider configuration and native OAuth tests are blocked by missing credentials.
- AI evaluation fixtures and provider success/fallback tests are blocked by the missing OpenAI key and disabled feature flag. Insufficient data to verify release accuracy thresholds.

## Assumptions

- The hosted project remains authoritative and all hosted IDs/data must survive.
- The standalone administrator app and unified Expo application are the maintained clients.
- OpenFreeMap Liberty is an initial non-secret map style, configurable by environment/settings.
- Missing geocoder subdivisions are stored as `Not provided`; the confirmed PostGIS point remains authoritative.
- Zero/absent AI budget configuration does not authorize AI release; `ai.enabled=false` is the definitive gate.
## Profile remediation inspection — 2026-07-21

The inspection found identity fallbacks in the Expo service layer and screens, fabricated administrator devices/login history, unsupported administrator profile fields, a fixed verification badge, zeroed ratings/unread counts, and a database role-switch function capable of creating `A-YOS User` or `A-YOS Worker`. These paths are remediated by the real-profile migration, strict view-model mapping, actual aggregates, signed Storage URLs, real Auth/MFA state, and authentication-event recording. Historical baseline migrations remain immutable; the latest additive migration replaces their runtime functions.
