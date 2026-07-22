# Project Inspection

> Current merged baseline: `apps/admin` is the approved `admin-webapp` Vite/React source and `apps/mobile` is the approved unified customer/worker Expo source from `A-yos-Project-workerfrontend-refactor`. The Supabase backend and Git history come from `Vanitazsz/ayos-try` commit `1c7f0e147a1b419d76091f32f72a0fc08632a3ab`. Mock business records and synthetic identity fallbacks are prohibited.

## Source inspection

- `requirements/catalog.json` preserves FR-01–FR-104 and NFR-01–NFR-18 and is the local requirements authority.
- The original SRS and workflow source documents cited by older documentation are absent. Their content beyond the catalog is **INSUFFICIENT DATA TO VERIFY**.
- The approved Admin and unified customer/worker route trees were copied without changing their layouts, component names, styling, or navigation structure.
- The prior repository Next.js dashboard, prior Expo route tree, generated native Android output, local environment files, build output, and nested dependency directories were excluded from the merge.
- Generated data, static datasets, hard-coded OTP, simulated operations, fake Auth and incompatible routing implementations are excluded from production paths.

## Merged target state

- `apps/admin` uses Supabase Auth, validates a persisted Administrator account/profile, and maps approved dashboard screens to real tables, aggregates, Storage, RPCs, and Edge Functions.
- `apps/mobile` uses Supabase Auth, Data APIs, RPC, Storage, Realtime, queued AI functions, OpenRouteService functions, PostGIS coordinates, and MapLibre.
- Compatibility migrations `20260722000100` through `20260722000400` provide real profiles, queued AI, geocoding, administrator commands, and immutable single-role authorization required by the approved clients.
- Missing mandatory profile data returns incomplete/not-found/error states. It is not replaced with `A-YOS User`, `Administrator`, `Customer`, `Worker`, or other fabricated identities.

## Approved architecture decisions

- Supabase PostgreSQL, Auth, Data APIs, Storage, Realtime, Queues, Cron, Vault, and Edge Functions replace the prior NestJS/Prisma/Redis platform.
- Clients access authorized data directly; sensitive writes use transactional RPC functions.
- Supabase SQL migrations are the only schema authority.
- Administrator authenticator-app TOTP replaces administrator email 2FA.
- Expo uses persistent Supabase sessions; the Vite administrator application uses Supabase client sessions and database-backed role/profile validation.
- The approved AI workflow is Gemini-primary with OpenAI fallback only for eligible retryable failures. The approved location workflow uses OpenRouteService behind Edge Functions, PostGIS as coordinate authority, and MapLibre for rendering.
- Post-service Cash, protected bootstrap Administrator, immutable User/Worker separation, confirmed User/Worker deletion, manual worker wallet operations and administrator recommendation priority are implemented backend capabilities and must remain available.
- X and Apple authentication are explicitly removed. Google is the sole social authentication option and is credential-gated.

## Missing information and blockers

- Production credentials, quotas, callback contracts, and acceptance environments for Gemini, OpenAI, OpenRouteService, Google OAuth, Google Cloud Translation, Expo Push, and production email delivery.
- Final legal/business content, performance thresholds, browser/device matrix, production project topology, RPO, and RTO.
- The repository is linked to hosted project `qsurouiyvisykjkgjqmz`, and a restricted schema/data/roles inventory was captured before changes. Hosted and local migration histories differ, but a full canonical `public,storage` comparison returned an empty diff; no duplicate push or history repair was attempted.
- `OPENAI_API_KEY` and Google OAuth acceptance credentials are not configured. The legacy hosted `ai-recommendation` function cannot be removed until the approved Gemini/OpenAI replacement chain passes live acceptance.
- For these items: **Insufficient data to verify.**

## Security controls and risks

| Risk                                     | Control/status                                                                                                                                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct client data bypass                | Every public table enables RLS; sensitive tables lack direct mutation grants; commands use RPCs.                                                                                                                              |
| User creates Administrator               | Provisioning accepts Administrator only from service-controlled app metadata; negative probe executed.                                                                                                                        |
| Stale or insufficient admin assurance    | Server layouts, Route Handlers, RLS helpers, and sensitive RPCs check role/status/AAL.                                                                                                                                        |
| Cross-booking messages/location/payment  | Booking-party RPC/RLS, geography tables, and conversation-membership policies protect private data.                                                                                                                           |
| Public files or channels                 | Six private buckets and private Realtime policies; deployment must also disable public channels.                                                                                                                              |
| Duplicate/concurrent workflow commands   | Unique constraints, idempotency keys, row locks, and optimistic booking versions.                                                                                                                                             |
| Provider adapter mistaken for production | Stable fail-closed errors are returned without secrets; live-provider status remains unverified.                                                                                                                              |
| Account deletion                         | AAL2 RPC requires exact email confirmation, rejects Administrators, blocks accounts with private files or retained records, deletes eligible Auth/profile rows transactionally, and audits success without storing the email. |
| General Trash permanent deletion         | Planned allowlisted AAL2 command requires exact typed confirmation, retained-reference validation and audit records.                                                                                                          |

## Verified defects and corrections

| Issue                                                             | Severity | Root cause                                                                              | Correction                                                                                                             | Validation                                                        | Status           |
| ----------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------- |
| Realtime trigger accessed fields absent from the active table     | High     | One CASE expression referenced all possible record shapes                               | Use table-specific conditional branches and only `NEW` for insert/update triggers                                      | PostgreSQL workflow execution                                     | Resolved         |
| RPC parameters conflicted with column names                       | High     | PostgreSQL could not resolve names in matching/payment/review statements                | Rename conflicting parameters/variables and update client RPC payloads                                                 | Complete SQL workflow execution                                   | Resolved         |
| User metadata could request Administrator                         | Critical | Provisioning allowed `ADMIN` after enum parsing regardless of metadata source           | Require service-controlled app metadata for Administrator                                                              | Negative self-registration probe                                  | Resolved         |
| Worker could attempt approval-field updates                       | Critical | Whole-table update grant was broader than RLS intent                                    | Replace with column-level grants and approval-aware RLS                                                                | SQL grant inspection                                              | Resolved         |
| Admin session previously trusted proxy presence                   | High     | Proxy cookie existence was the primary boundary                                         | Revalidate Supabase user, role, status, and AAL in Server Components and handlers                                      | Type/lint inspection; hosted Auth E2E pending                     | Resolved         |
| Protected admin bootstrap required published Terms                | High     | The Auth trigger applied public-registration prerequisites to service bootstrap         | Exempt only service-controlled Administrator provisioning from the Terms gate                                          | PostgreSQL bootstrap/registration probe                           | Resolved         |
| Auth rejected Administrator creation before applying app metadata | Critical | The provisioning trigger depended on `raw_app_meta_data` during the initial Auth insert | Authorize provisioning with a hashed, expiring, single-use bootstrap ticket and remove the raw token after use         | 28 pgTAP bootstrap tests; local and hosted bootstrap/login probes | Resolved         |
| Disabled Remember Me could leave an older persisted session       | High     | Switching to volatile storage did not remove the prior SecureStore record               | Delete the Supabase Auth storage key whenever persistence is disabled                                                  | Strict client type check; device E2E pending                      | Resolved         |
| PostgreSQL implicitly granted RPC execution to `PUBLIC`           | Critical | New functions inherit PostgreSQL's default function privilege                           | Revoke schema-wide anonymous/public execution and retain explicit role grants                                          | Routine privilege query                                           | Resolved         |
| Selected workers could not download committed request media       | High     | Storage read policy covered owners, administrators, and conversation media only         | Add request/review relationship checks to the private Storage policy                                                   | Clean migration replay                                            | Resolved         |
| Edge MFA assurance data was treated as non-null                   | Medium   | Supabase client can return a null assurance payload on error                            | Fail closed on MFA API error or missing/non-AAL2 assurance                                                             | Deno check for all five functions                                 | Resolved         |
| Application account became active before email verification       | Critical | Auth rejected sessions, but the application row was immediately `ACTIVE`                | Keep User/Worker rows pending until the Auth email-confirmation trigger runs                                           | Pending-to-active PostgreSQL probe                                | Resolved         |
| Queue work could be archived after a failed Supabase mutation     | High     | Consumer did not inspect errors returned in mutation result objects                     | Check every result, deduplicate effects, retry failures, and archive only success                                      | Deno check and clean schema replay                                | Resolved         |
| CSV exports could preserve spreadsheet formula prefixes           | Medium   | Quoting alone does not neutralize formula interpretation                                | Prefix formula-leading cell values before CSV quoting                                                                  | Deno check                                                        | Resolved         |
| Numeric coordinates were the location authority                   | High     | Matching and tracking lacked PostGIS radius/index semantics                             | Use geography points, generated projections, GiST indexes, `ST_DWithin` and `ST_Distance`                              | Static security checks; local pgTAP blocked                       | Resolved in code |
| AI analysis endpoint always returned unavailable                  | High     | Only a fail-closed placeholder existed                                                  | Implement private media, transcription, three-provider chain, strict output validation, idempotency, and attempt audit | Deno check and two provider-chain tests                           | Resolved in code |
| Native and web clients had no map renderer                        | High     | MapLibre dependencies and platform implementations were absent                          | Add MapLibre GL JS/React Native, Expo plugin, typed GeoJSON view, and tracking screen                                  | Expo web and Android bundle exports                               | Resolved         |
| Migrations changed privileged PL/pgSQL setting                    | High     | Three migrations used a server-level `plpgsql.variable_conflict` assignment             | Remove the unnecessary assignment and use unambiguous parameter naming                                                 | Two clean Supabase database resets                                | Resolved         |
| Three RPCs retained ambiguous parameter/column names              | High     | Cancellation, support resolution, and refund SQL reused column names as arguments       | Rename parameters, qualify columns, use the named constraint, and update typed client payloads                         | SQL lint, clean reset, pgTAP, generated types                     | Resolved         |
| Default local database port was reserved by Docker                | Medium   | Colima's port allocator rejected `54322` despite no visible host listener               | Move only the A-yos local database port to `54332`                                                                     | Local stack health and two clean resets                           | Resolved         |
| Local analytics could not mount the Colima Docker socket          | Medium   | Optional collector attempted an unsupported host-socket mount                           | Disable optional unauthenticated local analytics; application logging remains unchanged                                | Local stack health check                                          | Resolved         |
| Expo web invoked the native SecureStore module                    | High     | A shared Supabase Auth adapter imported `expo-secure-store` on every platform           | Split platform adapters; use browser storage on web and SecureStore on native                                          | Adapter tests, fresh exports, browser reload                      | Resolved         |

## Industry taxonomy inspection

- Worker registration previously queried `service_categories` and presented each row as both a primary industry and its only skill; the hosted catalog therefore exposed only Cleaning, Electrical, and Plumbing.
- The registration autocomplete also accepted arbitrary text into `skillIds`, although the backend relationship requires category UUIDs.
- Migrations `20260722000500`–`20260722000600` add/reconcile `industries`, link categories and worker profiles by foreign key, preserve the three existing category rows, and seed 10 industries with 50 active skills. The reconciliation is required because the hosted authoritative schema already had an empty, earlier `industries` table without `sort_order`.
- Worker onboarding now validates the current frontend JSON shape and persists primary industry plus skills atomically. Direct authenticated writes to `worker_skills` are revoked to prevent cross-industry bypass.
- The registration autocomplete now renders only `industries` rows inside a bounded nested scroll view; active `service_categories` remain scoped to the selected industry as skills. Customer Home initially renders 8 services and request creation 4, with each See more action revealing the next 4 live catalog rows.
- Home's service search was disabled, request creation had no service search, and `geocodeSearch()` called a GET-only Edge Function using POST. The request form also accepted address text without producing the required coordinates, while its header “Use Current” control had no handler. Live catalog filtering, the correct authenticated GET contract, geocoded/GPS confirmation, and specific inline validation now resolve these defects without accepting unconfirmed map data.

## Executed validation

- ESLint and strict TypeScript passed for all 11 workspace packages.
- Thirty-one Vitest tests passed across contracts, domain logic, configuration, observability, Supabase helpers, security, platform contracts, mobile session storage, Admin, and traceability.
- Deno strict checking passed for all configured Edge Functions, including the imported queued-AI, geocoding, route, and authenticated-session functions. Two retained Edge unit tests passed after obsolete adapter tests were removed.
- The approved Vite administrator production build and Expo web export passed.
- Stack/source-secret verification passed, and the traceability gate confirmed FR-01–FR-104 and NFR-01–NFR-18.
- Colima and the complete local Supabase stack started successfully. The latest clean reset applied all fifteen migrations and the seed deterministically.
- Database lint found no application-schema errors after corrections. Six remaining lint reports originate in Supabase's installed `extensions` schema (PostGIS helper functions), not project functions.
- All 248 pgTAP assertions passed across nine files, including immutable role isolation, taxonomy/onboarding validation, compatibility profile/RPC/Storage contracts, and existing RLS/domain invariants.
- Supabase generated database types from the validated local schema; strict TypeScript passed after client repositories adopted those generated RPC names and argument types.
- The repository is safely linked to the hosted `A-yos` project, and mobile/admin ignored environment files contain only the hosted URL and publishable key.
- The restricted hosted backup contains 4 Auth users, 4 account rows, 2 customer profiles, 2 worker profiles, 1 administrator profile, and 2 Storage object records. No identity or business row was imported from a mock dataset.
- The complete canonical migration result has a zero-byte schema diff against linked hosted `public` and Storage schemas. Hosted migration version history is intentionally left unchanged because replaying already-present objects would be unsafe.
- Hosted Supabase rejected `123` / `123` with `invalid_credentials`. Live AI, transcription, OpenRouteService, tile, Translation, Expo Push, Google OAuth, hosted Storage, Realtime, and queue-provider calls were not executed. **Insufficient data to verify.**

## Current status

The merged TypeScript/Supabase/PostGIS/MapLibre implementation passes local database replay, all 248 pgTAP assertions, static/unit checks, administrator build, and Expo web-export gates. Customer and Worker identities are permanently separated by their immutable primary role. The obsolete Downloads repositories were permanently deleted after cutover verification. Hosted project `qsurouiyvisykjkgjqmz` contains the canonical database and Storage schema with a verified empty diff, plus real Supabase Auth/account/profile records that remain available across devices. Live providers, native binary builds, backup restoration, and authenticated cross-application E2E remain unverified. The project is not declared production-complete.
