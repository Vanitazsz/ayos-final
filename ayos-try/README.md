# A-YOS

A-YOS is a local service-matching and booking platform with the approved Expo application for customer and worker accounts and the approved Vite/React administrator dashboard. Supabase provides PostgreSQL/PostGIS, Auth, Data APIs, Storage, Realtime, Queues, Cron, Vault, and Edge Functions. This working tree merges those frontends with backend commit `1c7f0e147a1b419d76091f32f72a0fc08632a3ab` from `Vanitazsz/ayos-try`.

## Main features

- Supabase email/password authentication, email OTP verification and recovery, persistent mobile sessions, and administrator TOTP MFA.
- Permanently separated User/Worker accounts, structured worker verification, categories, availability, matching, booking lifecycle, Cash settlement, receipts, reviews, support, reports, audit, Trash, and Restore.
- Cash-only customer settlement plus administrator-verified manual GCash/bank Worker top-ups and transactional payout holds, completion, and reversal.
- Direct RLS-protected reads and low-risk updates; sensitive workflow changes use transactional security-definer RPC functions.
- Private media buckets, signed access, private Realtime channels, PGMQ jobs, and scheduled queue consumption.
- Authenticated queued AI processing with per-request consent, Gemini primary analysis, retryable OpenAI fallback, and persisted provider-attempt audit data.
- OpenRouteService forward/reverse geocoding and routes behind Edge Functions, with PostGIS coordinates and MapLibre rendering.
- Supabase-backed industry and service discovery with a scrollable 10-industry worker catalog, live service search, incremental customer service grids, and confirmed Philippine address/GPS selection.

## Technology used

| Layer                  | Technology and current version                                                                       | Use in A-YOS                                                                                                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Languages              | TypeScript 5.9.3, JavaScript, Shell, PL/pgSQL                                                        | TypeScript is the application language; JavaScript is limited to ecosystem configuration; guarded Shell scripts orchestrate local/CI work; PL/pgSQL implements RLS helpers, triggers, queues, geospatial queries, and transactional RPCs. |
| User/Worker frontend   | Expo 54, Expo Router 6, React 19.1, React Native 0.81, React Native Web 0.21                         | Android, iOS, and web route groups with Supabase sessions and separate customer/worker workspaces.                                                                                                                                        |
| Administrator frontend | Vite 8, React 19.2, React Router 7, `@supabase/supabase-js` 2.110                                    | Client-rendered administrator dashboard with Supabase session, role, profile, and MFA checks.                                                                                                                                             |
| Maps                   | MapLibre GL JS 5.24, MapLibre React Native 11.3, PostGIS                                             | Platform-specific map rendering, GeoJSON contracts, nearby-worker filtering, distance ordering, private live tracking, and provider-backed route/ETA requests.                                                                            |
| Backend                | Supabase PostgreSQL 17/PostGIS, Auth, Data API, Storage, Realtime, Edge Functions, PGMQ, Cron, Vault | The sole backend and schema authority; no NestJS, Prisma, Redis, Socket.IO, MinIO, or custom token runtime is required.                                                                                                                   |
| Client API             | `@supabase/supabase-js` 2.110, `@supabase/ssr` 0.8                                                   | Direct RLS-protected access, Auth, RPC, Storage, Realtime, and Edge Functions.                                                                                                                                                            |
| AI                     | Gemini structured output; OpenAI Responses and Transcriptions                                        | The approved frontend flow queues Gemini as primary and invokes OpenAI only after eligible retryable failures. Results are schema-validated and persisted.                                                                                |
| Tooling                | pnpm 11.9, Turborepo 2.5, ESLint 9.38, Prettier 3.6, Supabase CLI 2.109, Docker                      | Workspace builds, static checks, local Supabase, deterministic migrations, generated database types, and CI.                                                                                                                              |

## Prerequisites

- Node.js 22.23 or newer and pnpm 11.9
- Docker Desktop or a running Docker-compatible daemon
- Supabase CLI dependencies installed by `pnpm install`
- Android Studio or Xcode only for native simulator builds

## Local setup

```bash
cp .env.example .env
pnpm install
pnpm supabase:start
pnpm db:reset
pnpm db:types
pnpm admin:bootstrap
pnpm dev
```

Copy the local URL, publishable key, and secret key printed by `supabase start` into `.env`. Never place `SUPABASE_SECRET_KEY` in a `NEXT_PUBLIC_*`, `VITE_*`, or `EXPO_PUBLIC_*` variable.

`pnpm admin:bootstrap` loads `.env.local` when present. It prepares a hashed, ten-minute, single-use database ticket, creates the Auth identity, provisions the protected Administrator account, removes the raw ticket from Auth metadata, and verifies the final records. Creating an Administrator directly in the Supabase Dashboard is intentionally rejected.

Local endpoints use Supabase API `http://127.0.0.1:54321`, database port `54332`, Studio `http://127.0.0.1:54323`, Mailpit `http://127.0.0.1:54324`, admin `http://localhost:5173`, and the Expo URL printed by its development server. Optional local Supabase analytics is disabled because it is not required by the application and its Docker-socket collector is incompatible with the configured Colima mount.

The seed contains development-only legal content. Migrations `20260722000500` and `20260722000600` install and reconcile the production reference taxonomy of 10 industries and 50 skills idempotently across clean and hosted schemas; they do not create sample workers or business records. Replace all legal content before production.

## Validation

```bash
pnpm db:reset
pnpm db:lint
pnpm test:db
pnpm db:types
pnpm traceability:check
pnpm contracts:check
pnpm functions:check
pnpm functions:test
pnpm verify:stack
pnpm verify
pnpm test:e2e
```

`db:reset`, database tests, type generation, and local Edge Function execution require the Supabase Docker stack.
The imported Playwright suites describe the previous repository frontends and are not an acceptance gate for the approved layouts. Admin and Expo production builds, database tests, Edge Function checks, and package tests are the current merge gates. Authenticated lifecycle acceptance still requires dedicated User, Worker, and AAL2 Admin fixtures.

See [MERGE_REPORT.md](./MERGE_REPORT.md) for source provenance, conflict decisions, compatibility migrations, and verification evidence.

## Staging and production

The Admin and Expo clients target hosted project `qsurouiyvisykjkgjqmz`. User credentials, account roles, profiles, and business records are stored in hosted Supabase rather than on a device. A user changing devices signs in again with the same verified identity; the account remains available even though the previous device's local session is not copied.

A restricted hosted schema/data/roles backup was captured on 2026-07-22. A linked comparison of the full canonical migration result against hosted `public` and Storage schemas returned an empty diff, so no duplicate migration replay or history repair was performed. Hosted/local migration version histories remain different but resolve to the same schema. Do not delete accounts or force the clean-cutover history into this project.

Configure `GEMINI_API_KEY`, `OPENAI_API_KEY`, `OPENROUTESERVICE_API_KEY`, `EXPO_ACCESS_TOKEN`, and `EDGE_FUNCTION_SHARED_SECRET` only as server/Edge Function secrets. Set `GOOGLE_OAUTH_ENABLED` after configuring Supabase Auth Google credentials. `EXPO_PUBLIC_MAP_STYLE_URL`, `EXPO_PUBLIC_EAS_PROJECT_ID`, and the Supabase publishable client settings are public client configuration. Missing bindings return stable fail-closed errors.

## Troubleshooting and limitations

- **Supabase will not start:** start Docker Desktop/Colima and rerun `pnpm supabase:start`.
- **Registration unavailable:** publish Terms; the account-provisioning trigger fails closed without them.
- **OTP not received:** inspect local Mailpit or configure hosted Supabase SMTP and email templates.
- **Administrator rejected:** apply the secure bootstrap migration and run `pnpm admin:bootstrap`; Dashboard creation and self-registration as Administrator are prohibited.
- **Administrator command requires MFA:** complete authenticator-app enrollment and use an AAL2 session.
- **Account deletion blocked:** Administrator and protected accounts cannot be deleted. Remove private Storage objects first; accounts referenced by retained bookings, payments, messages, support, or other business records must be suspended instead.
- **Provider unavailable:** configure the corresponding Edge Function provider and secret.
- **Manual top-up remains pending:** verify the private proof and settlement reference in Admin Finance. Only an AAL2 administrator approval credits the immutable ledger.
- **Map not rendered:** configure `EXPO_PUBLIC_MAP_STYLE_URL`; this value must be safe for a public client bundle.
- **Database tests unavailable:** start Docker Desktop or Colima before running the local Supabase reset and pgTAP suite.
- **Worker industries unavailable:** apply migrations through `20260722000600_reconcile_hosted_industry_taxonomy.sql`; registration reads active `industries` and their active `service_categories` directly from Supabase.
- Provider sandbox credentials, new Supabase project identifiers, OAuth callback domains, final legal content, native signing identifiers, retention rules, performance thresholds, RPO, and RTO remain unspecified. **Insufficient data to verify.**

See [REQUIREMENTS.md](./REQUIREMENTS.md) and [PROJECT_INSPECTION.md](./PROJECT_INSPECTION.md) for requirement-level evidence.
