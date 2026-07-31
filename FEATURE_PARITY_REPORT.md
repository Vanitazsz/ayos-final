# Verified Feature Parity Report

Date: 2026-07-31

Reference: `Vanitazsz/ayos-final@Fiel-Backup1` (`2c15bd3b3f748a4e292b283dd29bf0990fbc19d9`)

Integration base: current workspace branch `changes`

## Audit result

The reference commit is an ancestor of the current workspace HEAD. No tracked reference file is missing from the current branch. Current-workspace live dispatch, worker arrival, administrator, mobile, and security changes therefore supersede the reference where behavior differs; the reference was not bulk-copied over newer work.

| Capability                                                                                                                                                                           | Status                                                           | Local verification                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Shared enums, schemas, domain packages, generated database contracts, and error handling                                                                                             | Present and verified                                             | Unit, type, contract, and traceability checks                                   |
| Registration, email OTP screens, recovery, persistent sessions, and profile completion                                                                                               | Present and verified locally                                     | Unit and Playwright public/fixture flows                                        |
| Immutable User, Worker, and Admin separation; suspended/deleted-account fail-closed behavior                                                                                         | Present and verified                                             | Role, RLS, bootstrap, and account-deletion pgTAP suites                         |
| Industry and service discovery                                                                                                                                                       | Present and verified                                             | Deterministic catalog Playwright flows and taxonomy database tests              |
| Worker registration, skills, rates, availability, approval, and readiness                                                                                                            | Present and verified                                             | Worker setup/rate Playwright flows and matching pgTAP suites                    |
| Customer request creation, saved address/GPS selection, radius, scheduling, and no-match handling                                                                                    | Present and verified                                             | Playwright request flows and matching database tests                            |
| Ranked matching and single-worker dispatch waves                                                                                                                                     | Present and verified                                             | Dispatch, pricing, re-offer, radius, and readiness pgTAP suites                 |
| Booking acceptance, arrival, lifecycle transitions, cancellation, and completion confirmation                                                                                        | Present and verified                                             | Booking lifecycle, privacy, arrival, payment, and Playwright tests              |
| Booking history, receipts/payment amounts, ratings, reviews, support, privacy, and terms                                                                                             | Present and verified                                             | Database, contract, unit, and Playwright tests                                  |
| Participant-only tracking, location updates, contact actions, realtime refresh, and safe route fallback                                                                              | Present and verified locally                                     | Security, contract, build, and fixture tests                                    |
| Matched-only chat, realtime updates, closed-chat read-only state, and retry behavior                                                                                                 | Present and verified                                             | Messaging pgTAP and Playwright flows                                            |
| In-app notifications, queues, and push failure handling                                                                                                                              | Present and verified locally                                     | Unit, Deno, contract, and queue checks                                          |
| AI analysis, media assistance, translation, reports, geocoding, reverse geocoding, and route contracts                                                                               | Present and verified with unavailable/error states               | Deno checks/tests, contracts, and mocked Playwright flows                       |
| Administrator users, workers, bookings, payments, reviews, support, reports, services, subdivisions, notifications, settings, audit, profile, trash, restore, and permanent deletion | Present and verified locally                                     | Admin build, contracts, pgTAP, public and mocked authenticated Playwright flows |
| Administrator AAL2 enforcement                                                                                                                                                       | Present and verified in database/contracts; live fixture blocked | Security tests pass; real administrator credentials are not configured          |
| Hosted Supabase deployment state                                                                                                                                                     | Provider-gated                                                   | Local migration replay passes; hosted migration deployment was not authorized   |

## Corrections made during verification

- Moved manual rollback SQL out of the executable migration directory, eliminating duplicate migration versions.
- Restored fail-closed matching invariants removed by the latest resilience migration: pending workers are not auto-approved, skills and rates are required, schedules and fresh presence are enforced, blocked accounts are excluded, and one ranked worker is offered per dispatch wave.
- Preserved the live-dispatch retry timestamp refresh and 75-second worker-presence grace window.
- Updated stale database fixtures for required booking prices, worker readiness, customer-authenticated rate estimates, and the actual pgTAP plan count.
- Fixed session-expiry notice ordering so local sign-out cannot erase the user-facing expiry explanation.
- Made Playwright startup and taxonomy fixtures deterministic without production credentials.
- Corrected the lint task graph so package-generated types exist before dependent lint checks.
- Excluded generated SQL dump files from Markdown formatting.

## Verification evidence

- Clean migration replay: passed.
- Database tests: 21 files, 387 assertions, passed.
- Playwright: 61 passed, 2 skipped because real administrator credentials are not configured.
- Repository `verify`: formatting, lint, type checks, Edge Function checks/tests, unit/package tests, traceability, frontend/backend contracts, administrator build, and Expo web export passed.

## External blockers

The following cannot be described as 100% live-verified without external configuration or authorization:

- SMTP delivery and real email OTP acceptance
- Google OAuth credentials and redirect-domain acceptance
- AI provider credentials and provider acceptance fixtures
- Routing and geocoding provider credentials, quotas, and live acceptance fixtures
- Push notification credentials and physical-device delivery
- Native iOS/Android device testing
- Real administrator AAL2 credentials for the two authenticated visual checks
- Hosted Supabase migration deployment and hosted schema reconciliation

These paths retain explicit unavailable, retry, or authentication-required states and fail closed where authorization is required.
