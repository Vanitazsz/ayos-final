# Change Log

## 2026-07-27

### Booking lifecycle and database contracts

- File: `supabase/migrations/20260727120000_booking_lifecycle_hardening.sql`
  - Before: the final migration allowed either booking participant to jump to any status, ignored optimistic-lock versions, swallowed audit-write failures, and a later grant allowed direct booking updates.
  - Change: restored ordered worker/admin-only transitions, required the current booking version, made status/audit writes atomic, hardened cancellation validation, and revoked direct authenticated updates.
  - Verification: fresh database reset, scoped database lint, and full pgTAP suite pass.
- File: `apps/mobile/services/api.ts`
  - Before: lifecycle RPC calls omitted `p_expected_version`; several functions caught any RPC failure and directly updated `bookings`, bypassing the workflow.
  - Change: lifecycle and cancellation calls now read and pass the current version and propagate RPC failures; all direct-update fallbacks were removed.
  - Verification: mobile typecheck/tests and database lifecycle contracts pass.
- File: `apps/admin/src/services/adminData.js`
  - Before: worker loading queried a nonexistent `wallets` table, causing the frontend/backend contract gate to fail.
  - Change: query the real `wallet_accounts`/`wallet_transactions` relationship and derive available earnings from persisted ledger entries.
  - Verification: Admin build and frontend/backend contract check pass.

### Authentication, authorization, and public routing

- Files: `supabase/migrations/20260727140000_google_oauth_provisioning.sql`, `apps/mobile/services/auth.ts`
  - Before: first-time Google identities did not carry an application role, so account provisioning rejected otherwise valid OAuth users.
  - Change: first-time Google identities default to the customer role while password registration continues to require an explicit customer or worker role; OAuth names are persisted and the callback exchanges a real authorization code.
  - Verification: provisioning pgTAP tests pass, the migration is deployed to hosted project `qsurouiyvisykjkgjqmz`, and the current production build completed the hosted Google authorization-code callback and landed in the authenticated customer workspace on 3/3 sign-out/sign-in attempts.
- Files: `apps/mobile/app/(auth)/landing.tsx`, `apps/mobile/app/(auth)/sign-in.tsx`, `apps/mobile/app/(auth)/register.tsx`, `apps/mobile/app/(auth)/login.tsx`, `apps/mobile/app/(auth)/_layout.tsx`
  - Before: public entry URLs resolved inconsistently, the landing screen auto-redirected, the role query was ignored, and unavailable X/Apple controls remained visible.
  - Change: added stable customer/worker/sign-in entry routes, preserved the customer role selection, exposed readable registration validation, and retained Google as the only social sign-in control.
  - Verification: mobile public-entry and phone/tablet/desktop Playwright checks pass; visual baselines were regenerated for the intentional landing-page change.
- Files: `apps/admin/src/App.jsx`, `apps/admin/src/components/ui/Input.jsx`
  - Before: `/dashboard` did not resolve to the protected admin route and login labels were not associated with their fields.
  - Change: redirect the legacy dashboard URL through the protected route and connect labels to generated input IDs.
  - Verification: admin public-auth redirect, accessibility, and mobile-overflow Playwright checks pass.
- File: `supabase/config.toml`
  - Change: set explicit authentication endpoint rate limits; TOTP remains enabled.
  - Hosted verification: Google is enabled, TOTP is enabled, the enhanced 15-minute AAL1 session limit is enabled, and endpoint rate limits are active. The hosted Auth Site URL was corrected from `http://localhost:3000` to `https://ayos-final-mobile.vercel.app`; the app-scheme, local-development, and production redirect URLs are allow-listed.
  - Deferred: end-user 2FA enrollment, challenge, and recovery UI were not added because a safe rollout requires recovery and mandatory-enrollment policy decisions not present in the repository. Hosted TOTP and the administrator AAL2 authorization gates remain enabled.

### Matching, pricing, privacy, and trust controls

- File: `supabase/migrations/20260727130000_trust_pricing_and_reoffer.sql`
  - Change: added worker-owned per-skill rates, strict eligible-worker filtering, one-at-a-time dispatch, decline/expiry re-offers, rate snapshots on booking selection, participant reports/blocks/disputes, and private booking proof metadata/RPCs.
  - Verification: pgTAP exercises owned rate writes, service/area/availability/approval matching, sequential re-offer, real-rate booking snapshots, safety controls, proof attachment, bilateral cash settlement, receipt creation, and review persistence.
- File: `supabase/migrations/20260727150000_booking_address_privacy.sql`
  - Change: assigned workers cannot read the exact service address while a booking is pending; access begins only after acceptance.
  - Verification: customer, pending-worker, accepted-worker, unrelated-worker, and administrator address-read contracts pass.
- Files: `apps/mobile/services/api.ts`, `apps/mobile/services/liveDispatch.ts`, `apps/mobile/services/uploads.ts`
  - Change: connected matching, rates, lifecycle, reports, blocks, disputes, re-offers, private proof uploads, reviews, and payment confirmations to real Supabase tables/RPCs; removed unsafe lifecycle fallbacks and fabricated price fallbacks.
  - Verification: mobile typecheck, unit tests, frontend/backend contracts, no-mock gates, database tests, and production export pass.
- Files: `apps/mobile/app/(worker)/industry-skills.tsx`, `apps/mobile/app/(worker)/booking-request/[id].tsx`, `apps/mobile/app/(worker)/verification.tsx`
  - Change: workers can persist their own rates, follow ordered booking transitions, decline into automatic re-offer, report a booking, upload post-completion proof, confirm cash settlement, and see accurate ID review states.
  - Verification: typed API integration and database workflow tests pass.
- Files: `apps/mobile/app/new-request/create.tsx`, `apps/mobile/app/new-request/issue-summary.tsx`, `apps/mobile/app/new-request/budget-config.tsx`, `apps/mobile/app/new-request/matching.tsx`, `apps/mobile/app/new-request/success.tsx`, `apps/mobile/app/accept-worker/[id].tsx`
  - Change: removed hidden/generated budget defaults, display a real worker rate or “Request a quote,” require explicit budget confirmation, and route quote conversations and successful requests to valid screens.
  - Verification: mobile typecheck, tests, route audit, Playwright service-request checks, and production export pass.
- Files: `apps/mobile/app/tracking/[id].tsx`, `apps/mobile/app/payment/[id].tsx`, `apps/mobile/app/payment.tsx`, `apps/mobile/app/payment/success.tsx`, `apps/mobile/components/booking/CompletedSummary.tsx`
  - Change: hide pending contact details, expose report/block/dispute actions, remove fabricated payment values, require both booking parties to confirm cash, and show success only for a persisted successful payment.
  - Verification: bilateral confirmation, receipt, lifecycle, and privacy pgTAP tests pass.
- Files: `apps/mobile/app/review/[id].tsx`, `apps/admin/src/pages/admin/Support.jsx`, `apps/admin/src/pages/admin/Analytics.jsx`, `apps/admin/src/services/adminData.js`
  - Change: reviews now propagate upload/database errors and navigate only after success; administrators can see reports/disputes; analytics and booking totals use agreed persisted amounts.
  - Verification: review/payment database workflow, admin lint, contracts, and build pass.
- File removed: `apps/mobile/data/workerEarnings.ts`
  - Reason: removed an unused hardcoded earnings fixture.

### Database history and generated contracts

- Files: `supabase/migrations/20260723030001_hosted_dispatch_history_reconciliation.sql`, `supabase/migrations/20260723040001_provision_account_reconciliation.sql`, `supabase/migrations/20260723120001_live_dispatch_booking_reconciliation.sql`, `supabase/migrations/20260723120002_remote_placeholder.sql`, `supabase/migrations/20260723040400_profile_read_rls_fix.sql`
  - Change: repaired duplicate migration versions, replaced a corrupt UTF-16 no-op placeholder with UTF-8 SQL, and made the repeated profile policy migration idempotent.
  - Verification: a fresh local `supabase db reset` completes successfully.
- Files: `packages/supabase/src/database.generated.ts`, `supabase/tests/database/booking_address_privacy.test.sql`, `supabase/tests/database/google_oauth_provisioning.test.sql`, `supabase/tests/database/trust_pricing_and_reoffer.test.sql`, `supabase/tests/database/live_dispatch_schema_contract.test.sql`, `supabase/tests/database/rls_and_invariants.test.sql`
  - Change: regenerated database types and added/updated contract and behavioral coverage.
  - Verification: 19 database files and 333 assertions pass; `public`/`private` schema lint reports no errors.

### Hosted schema reconciliation and admin compatibility

- File: `supabase/migrations/20260727160000_hosted_core_schema_reconciliation.sql`
  - Before: hosted migration history marked several older migrations as applied even though core booking, cancellation, locale, request-media, and address-privacy columns or indexes were absent.
  - Change: additively restored and backfilled the required core columns and constraints without dropping legacy tables or deleting hosted rows.
  - Verification: the hosted project retained its existing accounts, requests, bookings, and payments; local reset succeeds; local and hosted `public`/`private` lint report no errors.
- Files: `supabase/migrations/20260727170000_worker_wallet_balance_compatibility.sql`, `apps/admin/src/services/adminData.js`
  - Before: hosted worker earnings used the legacy `wallets.available_minor` ledger while the current local schema uses `wallet_accounts` transactions, causing PostgREST relationship errors in the authenticated administrator dashboard.
  - Change: added an administrator-only normalized balance RPC that reads the persisted ledger available in each schema; no financial rows are rewritten.
  - Verification: migration deployed successfully, hosted lint is clean, and authenticated dashboard/worker-review browser checks pass without a wallet relationship error.
- Files: `apps/admin/src/components/Sidebar.jsx`, `apps/admin/src/components/Navbar.jsx`, `apps/admin/src/pages/admin/Dashboard.jsx`, `tests/admin-e2e/authenticated-admin.spec.ts`, `tests/admin-e2e/workers-verification.spec.ts`, `tests/mobile-e2e/service-catalog-expansion.spec.ts`
  - Change: added accessible mobile-navigation names, updated stale authenticated selectors, stabilized live-data visual comparisons by masking only dynamic values, and allowed realistic time for network-heavy geolocation/AI fixture cases.
  - Verification: all 45 Playwright cases pass together with no retries using two workers.

### Hosted deployment status

- Supabase project `qsurouiyvisykjkgjqmz` is linked and migrations through `20260727170000` are deployed.
- A schema-only pre-deployment reference dump is stored outside the repository at `/tmp/ayos-pre-stabilization-20260727.sql`. The existing hosted business rows were preserved.
- The current mobile production build was regenerated successfully and is ready for Vercel deployment.
- Blocker: the Vercel account authorized in this workspace (`el-yy`) does not own or list `ayos-final-mobile.vercel.app`; `vercel inspect` cannot access that deployment. A production frontend release cannot be completed safely until the owning Vercel account is authorized or a new production project/domain is explicitly selected.

### Final regression results

- `pnpm test`: 14/14 tasks pass, including 20 mobile tests.
- `pnpm test:db`: 19 files and 333 assertions pass.
- Authenticated Playwright run with administrator credentials: 45/45 pass in one no-retry run.
- `pnpm build`: 11/11 tasks pass; Admin and Expo Web production outputs build successfully.
- Mobile typecheck passes. Mobile and Admin lint pass with no errors; existing warnings remain.
- Edge Function checks/tests, frontend/backend contracts, no-mock gates, traceability tests, and scoped database lint pass.
- Repository format check still reports the same three pre-existing unrelated files: `pnpm-lock.yaml`, `supabase/functions/_frontend_shared/ai.ts`, and `tests/mobile-e2e/worker-industry-taxonomy.spec.ts`. Files changed for this stabilization pass format cleanly.
- Hosted database migrations, Auth configuration, hosted Google credential completion (3/3), and authenticated administrator verification are complete. The real-database pgTAP flow covers verification, request, strict matching, booking lifecycle, bilateral cash confirmation, receipt, proof, dispute, and review persistence.
- The only remaining production-release blocker is Vercel ownership of `ayos-final-mobile.vercel.app`; the currently authenticated Vercel account cannot deploy to or inspect that project.

### Public-entry UI cleanup

- Files: `apps/mobile/app/(auth)/landing.tsx`, `apps/mobile/app/index.tsx`, `apps/mobile/app/(auth)/login.tsx`, `tests/mobile-e2e/public-entry.spec.ts`
  - Change: removed the public marketing landing UI and the sign-in screen’s “Register as Worker” row; unauthenticated entry and the legacy landing URL now open the existing sign-in screen.
  - Scope: worker registration logic and all authenticated customer/worker screens remain unchanged.
