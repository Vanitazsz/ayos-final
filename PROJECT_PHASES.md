# Project Phases

Status date: 2026-07-21. Production project: `qsurouiyvisykjkgjqmz`.

| Phase | Objectives | Completed work | Dependencies / remaining work | Status |
| --- | --- | --- | --- | --- |
| 1 — Project Inspection | Inventory both maintained frontends and hosted backend contract | Pages/routes/forms/actions/services/auth/mock patterns inspected; legacy customer copy distinguished from unified client | Native device acceptance remains separate | Complete |
| 2 — Backend Architecture | Adopt Supabase/PostGIS/Auth/Storage/Realtime/Edge and preserve hosted state | Architecture, client boundaries, RLS/RPC/Edge patterns implemented | Production web origin still unknown | Complete with activation item |
| 3 — Database Design | Pull hosted authority, archive drafts, add normalized domains | Baseline represented by seven versions; drafts archived; three additive migrations; RLS/indexes/constraints/Storage policies/reference seeds | Future changes require new migrations | Complete |
| 4 — Authentication | Email flows, sessions, roles, Google PKCE, admin validation | Persistent Expo sessions, recovery, safe provisioning, role switching, protected admin, AAL2 mutations, Google client code | Supply Google Web OAuth client ID/secret; configure provider/redirects; run same-email/native tests | Blocked externally for Google activation |
| 5 — Core APIs | Replace mocks with Auth/PostgREST/RPC/Realtime/Storage | Customer/worker/admin service layers and compatibility API wired; temporary/mock records removed | Run authenticated hosted disposable workflows after release credentials are available | Implemented; hosted acceptance pending |
| 6 — Business Logic | Requests, matching, bids, booking, cash, reviews, wallets, support, reports | Transactional RPCs, deterministic auditable matching, real transitions, ledger/payouts/campaigns/aggregates/reports | GCash/card intentionally unavailable | Complete for configured scope |
| 7 — File Storage | Real request/review/verification/chat/support/report files | Private buckets, UUID paths, MIME/size/ownership policies, uploads, report signed URLs | Lifecycle cleanup monitoring should be scheduled operationally | Complete |
| 8 — Notifications | In-app state/campaign metrics and Realtime | Notifications/read RPC, campaigns/deliveries, admin/Expo Realtime refresh | External push credentials/provider absent | In-app complete; push externally blocked |
| 9 — Security Hardening | Least privilege, provider-secret isolation, quotas/rates/audit | RLS, fixed search paths, explicit grants, AAL2, JWT Functions, CORS allowlist, media ownership, audit, rate/daily quota/timeout/feature settings | Add production web origins; provider budget/circuit evaluation requires live usage | Complete with operational configuration items |
| 10 — Testing | DB, functions, frontends, providers, OAuth, geospatial | Local clean reset, zero lint findings, generated types/typecheck, Edge Deno checks, Auth/API/RLS/Storage smoke, Expo typecheck/lint (0 errors)/web export, admin lint/build, hosted unauthorized JWT checks, zero linked diff | OpenAI/Google credentials; curated AI fixtures; native builds; authenticated hosted workflows | Core complete; provider acceptance blocked |
| 11 — Documentation | Synchronize all mandatory documents | All eleven mandatory documents updated to deployed schema/functions/client state and blockers | Keep synchronized with future migrations/releases | Complete |
| 12 — Deployment | Snapshot, migrate, deploy Functions, verify | Sensitive baseline snapshot; exact dry run; three migrations deployed; eleven Functions active/JWT-protected; secrets/models set; zero `public,private` diff | Configure Google/OpenAI/production origins, execute acceptance gates, then enable AI | Backend deployed; feature activation gated |

## Deployment evidence

- Pre-change snapshot: `backups/2026-07-21-production-baseline` (schema, business data, Auth/Storage schema/data, roles, prior AI function; git-ignored).
- Local `supabase db reset --local`: passed after final migration changes.
- Local `supabase db lint --schema public,private`: no schema errors.
- `npm run test:integration`: passed Auth, Edge API, anonymous RLS isolation, and Storage ownership using a disposable local user.
- Edge Deno checks: passed for all eleven functions.
- Expo: `tsc --noEmit` passed; lint has 0 errors/115 warnings; web export passed.
- Administrator: oxlint exits successfully with warnings; Vite production build passed.
- Linked dry run contained only `20260721010000`, `20260721011000`, `20260721012000`.
- Production database migration applied successfully.
- Production Functions list shows all eleven intended functions ACTIVE with `verify_jwt=true`.
- Unauthenticated probes for AI, geocoding, route, reports, and API returned `401`.
- Post-deployment migration-to-linked diff for `public,private`: empty.

## Remaining production acceptance gates

### Credentials/configuration

- Supply `OPENAI_API_KEY`.
- Supply Google production Web client ID/secret and configure Supabase provider.
- Register Google callback `https://qsurouiyvisykjkgjqmz.supabase.co/auth/v1/callback`.
- Add `ayos://auth/callback`, local callbacks, and eventual production web domain to Supabase redirects.
- Add production browser domains to `ALLOWED_ORIGINS`.

### AI evaluation

- Keep `ai.enabled=false` until text/image/audio/combined Gemini success is verified.
- Verify fallback only after two retryable Gemini failures and never on safety/consent/auth/media rejection.
- Verify both-provider/manual continuation, idempotency, schema/catalog/cost bounds, timeout/quota/concurrency/circuit/budget behavior.
- Run Tagalog/English/Taglish and plumbing/electrical/appliance/cleaning/carpentry/ambiguous fixtures.
- Require 100% schema validity and at least 90% curated category accuracy. Insufficient data to verify these thresholds now.

### OAuth/native

- Test new/returning/cancelled/failed Google sign-in, same-email linking, suspended rejection, and no role escalation.
- Test iOS/Android development builds and web callback/session refresh. Insufficient data to verify native acceptance now.

### Hosted workflow/operations

- Run disposable hosted customer/worker/AAL2 admin workflows without modifying protected existing records.
- Validate real ORS Philippine search/reverse/route/cache/rate-limit behavior with authenticated users.
- Configure monitoring/log drains/alerts, backup retention/PITR, and cost dashboards.
- Deploy administrator/Expo production artifacts only after their hosting/signing targets are supplied.

AI, Google, GCash/card, SMS, Apple/X, and push must remain disabled/unavailable until their specific gates pass. They must never be represented as successful before activation.
## Real-profile remediation status — 2026-07-21

- Database and Storage: complete; additive migration deployed to `qsurouiyvisykjkgjqmz`.
- Auth consistency: complete; confirmed Auth users now activate their public account through an `auth.users` update trigger.
- Profile Auth/RPC integration: complete for maintained Expo and administrator clients.
- Synthetic identity and administrator session samples: removed.
- Local database rebuild, schema lint, integration smoke, Expo typecheck/export, and admin build: passed.
- Hosted preservation: post-deployment dump confirms `admin@local.com`, its active account, and `A-YOS Administrator` profile remain present.
- Remaining operational task: populate optional profile, support classification, portfolio, and login-history fields through normal application use; no mock seed data is permitted.
