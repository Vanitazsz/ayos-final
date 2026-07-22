# Merge Report

## Sources

- Backend and Git history: `Vanitazsz/ayos-try`, branch `main`, commit `1c7f0e147a1b419d76091f32f72a0fc08632a3ab`.
- Administrator frontend: approved `admin-webapp` Vite/React source.
- Customer/worker frontend: approved unified Expo/Expo Router source.

Local `.env` files, build output, dependency directories, nested prototype copies, and nested npm lockfiles were not imported. The merged pnpm workspace has one root lockfile.

## Conflict decisions

- The GitHub repository remains the Git root and backend authority.
- `apps/admin` contains the approved Vite dashboard; the repository's previous Next.js dashboard was removed from the working tree.
- `apps/mobile` contains the approved Expo 54 application; the repository's previous Expo 57 screens and checked-in Android output were removed from the working tree.
- UI layouts, route files, component names, and styles were preserved.
- Service-layer database names were mapped to the backend's normalized tables (`service_templates`, `service_request_offers`, `wallet_accounts`, `payout_destinations`, `support_ticket_messages`, and related records).
- Additive migrations provide the approved frontend's profile, queued-AI, OpenRouteService, geocoding, report, and administrator command contracts.
- Placeholder profile generation was removed from account provisioning. Google creates only User accounts, and missing names fail with `PROFILE_NAME_REQUIRED`.
- User and Worker accounts now have one immutable primary role; all client and database role-switching paths are removed.

## Added backend compatibility

- Persisted profile completion and password-change timestamps.
- Persisted administrator name, location, biography, and avatar fields.
- Private `profile-avatars` Storage bucket and owner policies.
- `get_my_profile`, profile update/completion, avatar, password-event, dashboard, catalog, availability, bid, and worker-application RPC compatibility.
- Authentication-event recording through the authenticated `record-auth-session` Edge Function.
- Queued AI job/consent tables and Gemini-primary/OpenAI-fallback Edge Functions.
- OpenRouteService search, reverse-geocoding, and route Edge Functions with PostGIS route snapshots.
- Administrator notification draft/publish commands.

## Verification evidence

- Clean local Supabase rebuild: passed through all migrations and seed.
- Database pgTAP: 223 tests passed across eight files, including permanent single-role enforcement.
- Edge Function type checking: passed, including imported AI/geocoding/session functions.
- Edge Function unit tests: 2 passed.
- Workspace package tests: passed.
- Workspace type checking: passed.
- Administrator no-mock check and production build: passed.
- Expo no-mock check, TypeScript check, lint (warnings only), and web export: passed.
- Static frontend/backend contract audit: no missing literal RPC, Edge Function, table/view, or Storage bucket names.
- Git whitespace/conflict-marker check: passed.
- Full `pnpm verify`: passed (stack/secret scan, formatting, lint, typecheck, Deno checks, Edge tests, workspace tests, traceability, contract audit, Vite build, and Expo web export).
- Administrator and Expo production no-mock gates: passed.
- Hosted invalid-credential probe: `123` / `123` was rejected with HTTP 400 and `invalid_credentials` without creating client authentication state.
- The clean local schema replay and all 223 database/RLS assertions passed after rebuilding the local Docker database from canonical migrations.
- The two obsolete Downloads repositories were permanently deleted after verification; no process references either deleted path.

The approved frontend sources retain lint warnings inherited from those sources, but lint exits successfully with zero errors. No local `.env`, dependency directory, or build output was imported or left as an untracked deliverable.

## Deployment state

The repository is linked to hosted Supabase project `qsurouiyvisykjkgjqmz`. A restricted-permission hosted snapshot was created outside the repository at `/Users/jhonfiel/Documents/A-YOS/hosted-backups/qsurouiyvisykjkgjqmz/2026-07-22-auth-cutover`, covering schema, data, roles, migration history, deployed functions, and secret names/digests. The snapshot confirmed the real-profile provisioning and `get_my_profile()` contracts and preserved the existing `admin@local.com` identity.

No hosted migration or Edge Function deployment was performed because the hosted/local migration histories are incompatible; the dry run rejected the divergence and an automatic `db push` would be unsafe. The single-role migration is implemented and verified locally but requires an approved hosted-history reconciliation before deployment. The hosted legacy `ai-recommendation` function remains deployed because `OPENAI_API_KEY` is not configured and the approved removal gate requires the canonical Gemini/OpenAI chain to be operational first. No Git commit or GitHub push was performed.
