# A-yos Production Supabase Platform

A-yos is a multi-role Philippine services marketplace with a standalone administrator web application and a unified Expo customer/worker application. Supabase project `qsurouiyvisykjkgjqmz` is the production backend and provides Postgres/PostGIS, Auth, Storage, Realtime, RPCs, and TypeScript Edge Functions.

The approved layouts, routes, component names, styling, and field vocabulary are preserved. Business data now comes from Supabase rather than mock arrays, fixed identities, random events, fixed OTPs, temporary IDs, placeholder maps, or simulated success handlers.

## Implemented features

- Email/password Auth, verification, recovery, persistent refreshable sessions, logout, account status enforcement, roles, memberships, permissions, and AAL2 administrator writes.
- Google OAuth client flow for Expo/web using PKCE and `ayos://auth/callback`; provider activation still requires Google credentials in Supabase.
- Customer request capture with real camera, audio, Storage upload, consent, manual non-AI path, geocoded address, PostGIS point, scheduling, budget, bids, and deterministic matching.
- Worker registration, verification documents, skills, availability, jobs, bids, bookings, lifecycle transitions, wallet ledger, payout requests, reviews, and messaging.
- Cash confirmation, receipts, notifications, support tickets/messages, audit history, report exports, and administrator management screens.
- Gemini-primary AI jobs with Realtime status, strict structured output, retry rules, OpenAI fallback contract, catalog/cost validation, translation cache, review insights, provider attempts, quotas, and feature flags.
- Authenticated OpenRouteService search, reverse geocoding, routing, caching, Philippine bounds, distance, and ETA.
- MapLibre native/web maps with PostGIS coordinates, markers, service radius, and route GeoJSON.
- CSV, XLSX, and PDF report generation into the private `report-exports` bucket.

## Technology stack

| Layer | Technology |
| --- | --- |
| Languages | TypeScript, JavaScript, Shell, PL/pgSQL |
| Mobile/web client | Expo, React Native, Expo Router, React 19, Zustand, React Query |
| Administrator | React 19, Vite, Supabase JS |
| Maps | MapLibre GL, `@maplibre/maplibre-react-native`, GeoJSON |
| Geospatial | PostgreSQL/PostGIS, OpenRouteService |
| Backend | Supabase Auth, PostgREST, RPC, Realtime, Storage, Edge Functions |
| Tooling | Supabase CLI, Docker, Deno, TypeScript, ESLint/Oxlint, Prettier |

## Source locations

| Area | Path |
| --- | --- |
| Backend, migrations, functions, docs | `/Users/jhonfiel/Documents/A-YOS` |
| Administrator app | `/Users/jhonfiel/Downloads/A-yos-Project-main/admin-webapp` |
| Unified Expo app | `/Users/jhonfiel/Downloads/A-yos-Project-workerfrontend-refactor` |
| Archived incompatible drafts | `supabase/migrations_archive/incompatible-local-draft-2026-07-21` |
| Pre-deployment snapshot | `backups/2026-07-21-production-baseline` (git-ignored, sensitive) |

## Prerequisites

- Node.js 22+
- npm
- Docker Desktop
- Supabase CLI 2.109+
- Deno 2+
- Access to Supabase project `qsurouiyvisykjkgjqmz`

## Install and run locally

Backend:

```sh
cd /Users/jhonfiel/Documents/A-YOS
npm install
npm run supabase:start
npm run db:reset
npm run db:types
npm run functions:check
npm run typecheck
npm run test:integration
```

Administrator:

```sh
cd /Users/jhonfiel/Downloads/A-yos-Project-main/admin-webapp
npm install
npm run dev
```

Expo:

```sh
cd /Users/jhonfiel/Downloads/A-yos-Project-workerfrontend-refactor
npm install
npx expo start
```

Use an Expo development/production build for native OAuth acceptance. Expo Go is not an OAuth acceptance environment.

## Environment variables

Client-safe variables:

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` / `VITE_SUPABASE_URL` | Project URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key; RLS remains authoritative |
| `EXPO_PUBLIC_MAP_STYLE_URL` | MapLibre style URL; OpenFreeMap Liberty is the default |
| `EXPO_PUBLIC_AI_CONSENT_VERSION` | Must match `system_settings.ai.consent_version` |

Edge-only secrets:

| Secret | Status/purpose |
| --- | --- |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Present in hosted secret inventory; live output accuracy not yet accepted |
| `OPENAI_API_KEY` | Required and not supplied |
| `OPENAI_MODEL` | Configured as `gpt-5.6-terra` |
| `OPENAI_TRANSCRIPTION_MODEL` | Configured as `gpt-4o-mini-transcribe-2025-12-15` |
| `OPENROUTESERVICE_API_KEY` | Present in hosted secret inventory |
| `AI_TIMEOUT_MS` | Provider timeout, currently 45000 |
| `ALLOWED_ORIGINS` | Browser CORS allowlist; add the production admin/web domains before web release |

Never put service-role, secret, Gemini, OpenAI, Google client-secret, or OpenRouteService keys in frontend bundles.

## Database and migrations

The first seven local migration versions reproduce the hosted baseline. Production additions are:

- `20260721010000_production_domains.sql`
- `20260721011000_admin_operations.sql`
- `20260721012000_client_operations.sql`

All three were applied to the linked project on 2026-07-21. A post-deployment `public,private` migration-to-linked diff was empty. Only stable taxonomy and cancellation-reason data is seeded. Do not run files in `migrations_archive`.

## Edge API overview

Every active function requires a valid Supabase JWT:

- `api`
- `ai-analyze-request`, `ai-process-job`, `ai-translate-message`, `ai-review-insights`, `ai-provider-health`
- `geocode-search`, `geocode-reverse`, `route`
- `report-generate`

`ai-recommendation` is retained only as an authenticated `410 endpoint_replaced` response and never fabricates results.

Responses follow:

```json
{ "success": true, "message": "Request completed", "data": {} }
```

or:

```json
{ "success": false, "code": "machine_code", "message": "Human-readable message", "errors": {} }
```

## Common commands

```sh
npm run db:reset
npm run db:lint
npm run db:types
npm run functions:check
npm run typecheck
npm run test:integration
supabase migration list --linked
supabase db push --linked --dry-run
supabase functions deploy --project-ref qsurouiyvisykjkgjqmz --use-api
```

`--use-api` is required in this environment because local Docker bundling returned an opaque bundler error; server-side bundling deployed successfully.

## Production deployment

1. Create a fresh schema/data/Auth/Storage snapshot.
2. Reset and test the local database.
3. Confirm the linked dry run contains only reviewed additive migrations.
4. Apply migrations and confirm a zero post-deployment diff.
5. Configure Edge secrets and deploy authenticated functions.
6. Configure Google OAuth consent/client credentials and Supabase Google provider.
7. Add production redirect URLs and browser origins.
8. Build native development clients and test iOS, Android, and web callbacks.
9. Run disposable customer, worker, and AAL2 administrator workflows.
10. Enable `ai.enabled` only after provider credentials and acceptance thresholds pass.

## Current activation blockers

- `OPENAI_API_KEY` has not been supplied.
- Google OAuth client ID/secret and production web domain have not been supplied/configured.
- AI is intentionally disabled in `system_settings`; the required curated evaluation has not been executed. Insufficient data to verify the 90% category-accuracy acceptance target.
- Native iOS/Android development builds and Google callback tests have not been executed. Insufficient data to verify native OAuth acceptance.
- GCash/card, SMS, Apple/X login, and push delivery remain unavailable and return no fake success.

## Troubleshooting

- `CONTENT_NOT_CONFIGURED`: publish the Terms page before registration/request creation.
- `AAL2 administrator required`: complete MFA/AAL2 before an administrator mutation.
- `AI analysis is currently disabled`: continue manually or enable only after the documented gate.
- OAuth returns to the browser: verify `ayos`, `com.ayos.app`, callback URLs, and use a development build.
- No matches: confirm worker approval, category skill, availability window, service origin/radius, and request coordinates.
- Address save fails: confirm a Philippine point; missing provider subdivisions are stored as `Not provided` without changing the confirmed point.
## Real profile data and Storage

Profiles are persisted in `user_profiles`, `worker_profiles`, and `admin_profiles`; clients must not substitute Auth metadata, email addresses, or role labels for missing profile rows. Migration `20260721233000_real_profiles_zero_mock_records.sql` adds profile completion, administrator personal fields, password-change timestamps, authentication events, conversation reads, worker portfolio media, and owned private Storage buckets.

Profile avatars use `profile-avatars/<account-uuid>/<file>` and worker portfolio images use `worker-portfolio/<account-uuid>/<file>`. Both buckets are private. Clients resolve signed URLs after authentication. Run `npm run check:no-mocks` in each frontend before release.

Deploy profile infrastructure with:

```sh
supabase db push --linked
supabase functions deploy record-auth-session --use-api
```
