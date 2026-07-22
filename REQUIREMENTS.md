# Requirements

## Functional requirements

### Identity and access

- Support email/password registration, login, logout, email verification, recovery, refresh tokens, and persistent sessions.
- Support Google as the only active social provider through Supabase OAuth/PKCE.
- Provision new social users as customers and never derive privileged roles from email/metadata.
- Enforce active/suspended/deleted state, role memberships, active role, permissions, owner/participant scope, and AAL2 administrator mutations.

### Marketplace

- Read live categories/services/skills/offerings and administrator price bounds.
- Save a normalized Philippine address and PostGIS point atomically.
- Create, schedule, budget, match, bid on, select, book, track, cancel, complete, pay, and review a request with transactional state enforcement.
- Deterministic matching must use verified category compatibility, radius/distance, availability, rating, completed jobs, response/cancellation history, and recommendation priority.
- AI may explain but cannot change eligibility, authorization, moderation, or automatically book safety-critical work.

### Worker operations

- Register/enable worker role, upload verification documents, select live skills, submit application, receive an administrator decision, manage availability, bid/withdraw, transition bookings, and view wallet/payout data.
- Wallet transactions are append-only and idempotent; payouts require valid ownership/balance and administrator decisions.

### Communication and operations

- Persist original chat messages and cache translations only when locale differs.
- Provide notifications/read state, support tickets/messages/attachments, campaigns/delivery metrics, review votes/reports/replies/insights, audit logs, trash/recovery, dashboard aggregates, and CSV/XLSX/PDF exports.

### AI

- Require versioned consent per request with a manual path.
- Accept text, at most three photos, and at most one 60-second audio file from UUID-owned Storage.
- Queue an AI job and publish status/results through Realtime.
- Try Gemini at most twice for retryable timeout/429/5xx/schema failures; use OpenAI only after exhaustion.
- Never fall back for invalid input, missing consent/auth, invalid media, or safety rejection.
- Validate strict structured output, catalog IDs, price bounds, safety escalation, provider/model/reference metadata, and attempts.

### Geocoding/maps

- Authenticate and rate-limit forward/reverse/route endpoints, restrict to the Philippines, cache normalized results, and preserve `[longitude, latitude]` route order.
- Store provider text and point together; require a confirmed point even if manual text is used.
- Render real points, radii, matches, workers, customers, and route GeoJSON in MapLibre.

## Non-functional requirements

- Existing hosted records, Auth users, Storage objects, IDs, administrator identity, approved UI, routes, payload vocabulary, and state patterns must be preserved.
- Migrations are additive, reproducible, reviewed, and reversible through a protected snapshot/roll-forward fix.
- APIs return consistent JSON and correct HTTP/database error semantics.
- No production mock business records, fixed OTPs, fake identities, fake delays, fabricated AI, temporary IDs, random metrics, or placeholder maps.
- Documentation and generated database types remain synchronized.

## Security requirements

- RLS is enabled on application tables with least-privilege owner/role/participant policies.
- Security-definer functions use `search_path=''`, fixed SQL, explicit grants, bounded parameters, state checks, and audit records.
- Passwords and JWT/session handling remain in Supabase Auth; clients never store provider/service-role secrets.
- Private Storage paths start with `auth.uid()`, enforce purpose-specific MIME/size limits, and require metadata/ownership.
- Edge Functions validate gateway JWT plus current account/ownership/consent as appropriate.
- Administrator writes require hosted ADMIN membership and AAL2.
- CORS is allowlisted; production web origins must be added before web release.
- Inputs are length/range/type validated; PostgREST parameterization prevents SQL injection.
- AI logs exclude keys and duplicated private media.

## Performance requirements

- Use indexed foreign keys, spatial GiST indexes, selective composite indexes, and bounded pagination.
- Avoid N+1 reads through relational selects/aggregates where practical.
- Cache geocoding/search/routes with expiry and translations by message/locale.
- Bound AI media, timeouts, attempts, daily quotas, and concurrency.
- Realtime subscriptions filter by relevant entity when possible.

## Scalability requirements

- Stateless Edge Functions and Supabase managed services scale independently.
- Append-only ledgers/audit/provider attempts retain traceability under concurrency.
- RPC row locks/idempotency keys prevent duplicated state changes.
- Campaign delivery, AI jobs, and report exports have durable status rows for background execution/monitoring.

## Deployment requirements

- Link only to `qsurouiyvisykjkgjqmz` after confirming target.
- Snapshot schema/data/Auth/Storage/functions before production migration.
- Require local reset, DB lint, generated types, Edge checks, client builds, integration tests, exact dry run, and zero post-deployment diff.
- Configure Google, OpenAI, origins, redirects, native app identity, and provider monitoring before enabling their feature flags.
- Never enable AI until structured-output validity is 100% and curated category accuracy is at least 90%.
- Monitor Auth, Edge, database, RLS, Storage, Realtime, AI, geocoding, rate-limit, and cost logs.
## Real-data profile requirements

- A protected session requires an active `accounts` row and a role-appropriate profile row with a non-empty persisted display name.
- Signup and role switching must never generate placeholder identities.
- Missing required related profiles must return an error instead of a role-name fallback.
- Profile completion, updates, avatar ownership, password-change recording, conversation reads, and support assignment must be enforced server-side.
- Private profile and portfolio media must be owner-written and available only to authenticated authorized readers.
- Production builds must pass the no-mock regression checks.
