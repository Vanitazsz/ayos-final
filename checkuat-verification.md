# A-YOS UAT Verification Report

- **Source template:** `checkuat.md` (original baseline dated August 7, 2026; UAT#30 follow-up added August 9, 2026).
- **Date:** August 7, 2026
- **Method:** Static, read-only verification of every UAT scenario against the codebase (mobile app, Supabase Edge Functions/migrations, tests). No live execution, on-device testing, or UI automation was run for this report.
- **Scope:** Original 29 UAT modules plus the UAT#30 Voice & AI follow-up module. The original static findings below remain a dated baseline; the implementation addendum supersedes changed items.

## Legend

| Mark  | Meaning                                                                                     |
| ----- | ------------------------------------------------------------------------------------------- |
| `P`   | Fully implemented and testable in the current repo                                          |
| `P*`  | Partially implemented — main path exists, one or more required steps are missing/incomplete |
| `F`   | Not implemented / no supporting code found                                                  |
| `NVR` | Not verifiable in this repo — no UI/app source present (admin modules)                      |

## System-wide critical findings

## August 9 implementation addendum

- Manual GCash wallet top-up is now wired in the mobile worker wallet: amount, reference, private screenshot upload, owner-scoped pending-status reads, and refresh/polling are implemented. Administrator approval remains in the separate admin application.
- Tracking now has customer arrival/completion controls, persisted worker location updates, Call and confirmation-gated Emergency actions, proof-of-work visibility, and retryable worker location-denial/write-failure feedback.
- The payment success route now accepts the existing `?id=` navigation parameter, pre-checks the unique review, exposes “Rate your experience,” and links booking details to `/booking-summary/:id`.
- Voice transcription failures now return a stable `transcription_failed` response with a retry/manual-text recovery path; image-only AI analysis remains supported.
- The active `/request/:id` navigation targets were redirected to the existing matching flow. The two unreferenced legacy screens (`payment-received.tsx` and `(worker)/leave-feedback/[id].tsx`) were audited and intentionally left preserved without new callers.
- Hosted Supabase values still requiring operator verification: `ai.enabled`, provider keys/models, Auth “Confirm email,” and OTP template settings.

1. **No admin application exists in this repo.** `apps/` contains only `apps/mobile/`. `.gitignore:27-28` intentionally excludes the admin source: `# ignore admin source code to avoid pushing it` / `apps/admin/`. Every admin module (UAT#17–28) therefore has **no UI** here. `playwright.config.ts:32-33` boots `pnpm --dir apps/admin dev` (port 5173) and the `tests/admin-e2e/` specs target `http://localhost:5173`; neither can run from this repo. `infra/admin.Dockerfile` copies `apps/admin/dist`, which does not exist here.
2. **Backend/DB support exists for most admin functionality** via the Edge Function `supabase/functions/api/index.ts:19` (`GET /admin/{users,workers,bookings,payments,reviews,support,audit,settings,reports,ai-jobs}` and `/admin/dashboard`) and many admin RPCs in `supabase/migrations/`. This is server-side only; nothing is exposed through a UI in this repo.
3. **The Express/Prisma backend is NOT the active backend.** `backend/LEGACY.md:3` states it is "retained only as historical reference"; the active backend is Supabase. Where the legacy backend fully implements a scenario (search/filters, session revocation, INACTIVE_USERS campaigns, JSON reports, report download), it is cited as legacy evidence only.
4. **Catalog search is a dead link.** The Home search bar navigates to `/search` (`apps/mobile/app/(tabs)/home.tsx:77-84`), but no `/search` route exists (`glob apps/mobile/app/**/search*` = none). `filterServiceCatalog` (`apps/mobile/services/catalogSearch.ts:16-28`) is imported but never called.
5. **The worker wallet is simulated.** Top-up is labeled "Simulate Top-Up" with an explicit notice that no real payment is processed (`apps/mobile/app/(worker)/wallet.tsx:324-329`); payouts are disabled. Real top-up/payout admin-review RPCs exist only in the database layer.
6. **Worker/customer discovery gaps:** no "top five matches" comparison view, no pre-booking messaging, and live matching orders candidates by distance rather than a suitability score.
7. **Booking gaps:** no customer-initiated cancellation UI; refund policy is not shown before confirming cancellation; only the dispatch-timeout path inserts an explicit homeowner notification.
8. **Tracking gaps:** no Call and no Emergency action during an active booking (Chat is the only available action); location prompt/denial handling exists only on the worker side.
9. **Messaging gaps:** the chat Paperclip (attachment) button has no `onPress`; image/location sharing is not implemented.
10. **Receipt is not itemized** for the homeowner (shows total only); the 10% commission is visible only on the worker side.
11. **No app-UI language switching.** Filipino/English preference (`settings/language.tsx`) only controls chat-message translation, not the app UI.
12. **No Remember Me option.** Sessions always persist via AsyncStorage (`apps/mobile/lib/supabase.ts:16-18`).

---

## UAT#1: Login

| No. | Scenario                                                                       | Status | Comments                                                                                                         |
| --- | ------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------- |
| 1   | Open the application login page                                                | P      | `apps/mobile/app/(auth)/login.tsx`; landing redirect `(auth)/landing.tsx:4`; root guard `app/index.tsx:17-19`    |
| 2   | Enter a valid registered email and password, then log in                       | P      | `login.tsx:43-65` → `apps/mobile/services/auth.ts:48-92` (`signInWithPassword`); friendly errors `auth.ts:22-46` |
| 3   | Verify successful login opens the appropriate Home or Dashboard screen         | P      | Role-based redirect `login.tsx:50`: WORKER → `/(worker)`, else `/(tabs)/home`; also `index.tsx:21`               |
| 4   | Verify unauthorized access to protected pages redirects the user back to Login | P      | `apps/mobile/app/_layout.tsx:95-96` (SessionBoundary); tab guard `(tabs)/_layout.tsx:46`                         |
| 5   | Verify the Remember Me option keeps the user signed in on the next visit       | F      | No Remember Me control anywhere; sessions always persist (`lib/supabase.ts:16-18`)                               |

## UAT#2: Homeowner Registration & Onboarding

| No. | Scenario                                                                                | Status | Comments                                                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the Create Account screen from the landing page                                    | P      | `apps/mobile/app/(auth)/register.tsx`; entries at `login.tsx:123`, `onboarding.tsx:57,62`                                                                                                |
| 2   | Enter name, mobile number, email, password, password confirmation, and accept the terms | P      | `register.tsx:43-50, 202-314` (5 validated fields), `316-334` (terms toggle)                                                                                                             |
| 3   | Submit and verify the OTP is requested and validated                                    | P      | `register.tsx:62-63` → `services/auth.ts:94-141`; `(auth)/otp.tsx:68-115`; provisioning `20260720000100_platform.sql:321,332`                                                            |
| 4   | Verify invalid or incomplete registration details show clear feedback                   | P      | `register.tsx:207-313`; `apps/mobile/lib/workerRegistration.ts:90-111`; tests `lib/workerRegistration.test.ts:85-105`                                                                    |
| 5   | Verify the new account is signed in automatically and opens the Home screen             | P\*    | Auto sign-in works (`otp.tsx:77-89`) but a new USER is routed to `/(auth)/verify-identity` (line 88), not Home; Home is reached only after ID submit/skip (`verify-identity.tsx:97,206`) |

## UAT#3: Worker Registration & Onboarding

| No. | Scenario                                                       | Status | Comments                                                                                                                                                                 |
| --- | -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Open the Register as Worker flow                               | P      | `apps/mobile/app/register-worker.tsx`; `(auth)/register.tsx:63`                                                                                                          |
| 2   | Complete the worker account and email/OTP verification         | P      | Same OTP flow as UAT#2.3; `register-worker.tsx:357-359`                                                                                                                  |
| 3   | Select industry and service categories/skills from the catalog | P      | `fetchIndustriesAndSkills`; taxonomy seeded `20260722000500_industry_skill_taxonomy.sql:55-136`; `features/worker/WorkerIndustrySkillsScreen.view.tsx`                   |
| 4   | Set up services, service area, availability, and experience    | P      | `(worker)/service-setup.tsx` (`saveWorkerMatchingSetup`/`getWorkerMatchingReadiness`), per-day hours, radius 2–50 km                                                     |
| 5   | Submit identity information and government ID for review       | P      | `services/workerApplication.ts` (bucket `verification-documents`, 10 MB); `submit_worker_onboarding_identity` requires exactly 2 owned docs; `(worker)/verification.tsx` |

## UAT#4: Home Dashboard Module

| No. | Scenario                                                                | Status | Comments                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the Home screen after sign-in                                      | P      | `apps/mobile/app/(tabs)/home.tsx`; reached via `login.tsx:50` and `index.tsx:21`                                                                                                                         |
| 2   | View the main navigation: Home, Bookings, Create, Messages, and Account | P\*    | 5 tabs exist (`(tabs)/_layout.tsx:90-128`) but the bookings tab is labeled **"Activity"** (`:101`) and Create is an unlabeled floating button with an empty placeholder screen (`(tabs)/create.tsx:1-3`) |
| 3   | Browse the service categories presented on Home                         | P      | `home.tsx:27-36,62-71,248-286`; `hooks/useHomeData.ts:22` → `services/apiCore.ts:513`                                                                                                                    |
| 4   | Search the service catalog and view the first set of results            | F      | Search bar pushes to `/search` (`home.tsx:77-84`) but no `/search` route exists; `catalogSearch.ts` is dead code                                                                                         |

## UAT#5: Worker Discovery & Comparison

| No. | Scenario                                                                                      | Status | Comments                                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Open a worker profile and view rating, reviews, skills, experience, availability, and pricing | P\*    | `app/provider/[id].tsx:34,61` + `apiCore.ts:336-411`: rating/reviews/skills/experience/pricing shown; **availability is never rendered**                                                                     |
| 2   | Search and filter workers by category and sorting options                                     | P\*    | Category filter works (`app/category/[id].tsx:29`); **no search screen and no sorting UI**                                                                                                                   |
| 3   | Open the top five matches comparison view                                                     | F      | Top-5 ranking exists only in DB (`20260720000200_domain_rpcs.sql:34-59`, `match_candidates`); no comparison/side-by-side UI and no caller                                                                    |
| 4   | Send a message to a worker before selecting them                                              | F      | Chat requires an existing request (`app/chat/[id].tsx:29`); `start_worker_conversation` requires a legacy `match_candidates` row never populated by the live-dispatch flow; no message button on the profile |
| 5   | Verify the conversation appears in Messages                                                   | P\*    | List/realtime works (`components/ConversationListScreen.tsx:42,56-58`), but pre-booking conversations cannot be created due to 5.4                                                                           |

## UAT#6: Service Request Creation

| No. | Scenario                                                                 | Status | Comments                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the Create / Send Request flow and select a service category        | P      | `app/new-request/create.tsx:647-663`; entries from Home AI card (`home.tsx:113`) and category screen (`category/[id].tsx:36`). `(tabs)/create.tsx` is a null placeholder                                                        |
| 2   | Enter the issue description, budget, and notes                           | P\*    | Description input exists (`create.tsx:649`); **budget and notes are hardcoded** (`apiCore.ts:1519-1520`)                                                                                                                        |
| 3   | Attach a photo to the request                                            | P      | `create.tsx:28-36,614-617`; upload via `services/uploads.ts`; `useLiveMatching.ts:128`                                                                                                                                          |
| 4   | Confirm the service address and preferred schedule                       | P\*    | Address confirmation complete (`create.tsx:1426-1460`); **schedule is auto-set** to now+30min (`create.tsx:659`); the day/time pickers (`this-week.tsx`, `asap.tsx`) are orphaned — not registered in `new-request/_layout.tsx` |
| 5   | Review the request summary before sending                                | P\*    | AI summary + editable draft (`issue-summary.tsx:302-350`); full review surface lives in orphaned `asap.tsx`/`this-week.tsx`                                                                                                     |
| 6   | Use the AI Home Assistant to analyze an issue and create a request draft | P      | `issue-summary.tsx:48-110,188-196`; `apiCore.ts:1900-2001`; Edge Function `ai-analyze-request`; consent flow `create.tsx:1463-1546`                                                                                             |
| 7   | Send the request and verify a confirmation appears                       | P\*    | Request is published (`useLiveMatching.ts:114-128`); `new-request/success.tsx` exists but **nothing navigates to it** — user lands on the matching screen                                                                       |

## UAT#7: Matching Module

| No. | Scenario                                                                                      | Status | Comments                                                                                                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | View the list of matched workers for the request                                              | P      | `new-request/matching.tsx:140-183`; `useLiveMatching.ts:85-93` (live-dispatched notified list)                                                                                                                                                       |
| 2   | Verify matched workers are ordered by suitability (skills, location, availability, rating)    | P\*    | Eligibility filters use skills/availability/location (`20260723020000_live_worker_dispatch.sql:79-84`), but **ordering is only `ACCEPTED desc, distance_meters`** (`:126`); rating-based ranking exists only in the unused legacy `generate_matches` |
| 3   | Select a worker and send a booking request                                                    | P      | `useLiveMatching.ts:161-163` → `apiCore.ts:1098-1108` → `select_worker` (`live_worker_dispatch.sql:152-167`)                                                                                                                                         |
| 4   | Verify a clear message appears when no workers are available and filters/date can be adjusted | P      | `matching.tsx:29-48,128-138` (8 reason codes, "No Worker Accepted Yet", Change Date/Location, radius reconfigure)                                                                                                                                    |

## UAT#8: Booking Module

| No. | Scenario                                                                                                       | Status | Comments                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | View the booking with Pending status after the request is sent                                                 | P      | `(tabs)/bookings.tsx:19-20`; `services/bookingStatus.ts:43-47`; `tracking/[id].tsx:44-48`; enum `20260720000100_platform.sql:14`                                                                                                  |
| 2   | Verify the status updates to Accepted when the worker accepts                                                  | P      | `apiCore.ts:812-834` (`acceptJob` → `transition('ACCEPTED')`); allowed transition `20260731010100_*.sql:34-35`                                                                                                                    |
| 3   | Verify the status progresses through Preparing, En Route, Arrived, Service Started, In Progress, and Completed | P      | Canonical chain `20260731010100_*.sql:34-43`; transition helpers `apiCore.ts:916-937`; step map `tracking/[id].tsx:28-38,64-88`                                                                                                   |
| 4   | Accept, decline, or time out a request from the worker side and verify the homeowner is notified               | P\*    | Accept/decline `20260730120000_*.sql:494-516`; timeout notification `20260720000400_admin_and_queue_rpcs.sql:80`; **only the timeout path inserts an explicit notification row** — accept/decline notify only via realtime/status |
| 5   | Cancel a booking with a reason and confirm the cancellation                                                    | P\*    | Worker-side cancel fully implemented (`(worker)/cancel-service/[id].tsx`, `cancel_booking` RPC `20260805000000_*.sql:168-215`); **no customer-side cancel UI**                                                                    |
| 6   | View the cancellation reason and refund policy before confirming                                               | P\*    | Reasons shown pre-confirm (`cancel-service/[id].tsx:28-29`); refund amount exists in DB but is only displayed **after** cancellation (`tracking/[id].tsx:338-343`); REFUND_POLICY page is a local placeholder (`seed.sql:45`)     |
| 7   | View bookings organized into Upcoming, Ongoing, Completed, and Cancelled                                       | P      | `services/bookingTabs.ts:1-29`; used in `(tabs)/bookings.tsx:11-15,56`                                                                                                                                                            |

## UAT#9: Live Tracking Module

| No. | Scenario                                                                        | Status | Comments                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Allow location access when prompted during tracking                             | P\*    | Prompt exists only on the **worker** side (`services/deviceLocation.ts:25-31`, `(worker)/booking-request/[id].tsx:224-231`); the customer tracking screen never requests location |
| 2   | View the worker's location and ETA on the map                                   | P      | `tracking/[id].tsx:189-224`; `hooks/useBookingTracking.ts:22-28`; `components/booking/BookingMap.tsx:35-43` (ETA from route); Edge Function `route`                               |
| 3   | Verify location access denial is explained with a retry option                  | P\*    | Worker-presence denial + retry (`(worker)/index.tsx:214-223,259-268`, `_layout.tsx:61-65`, `WorkerPresenceContext.tsx:16-32`); no customer-side path exists                       |
| 4   | Verify Call, Chat, and Emergency options are available during an active booking | P\*    | **Chat** only (`tracking/[id].tsx:305-312`); Report-Provider is a `mailto:` link (`:152-162`); **no Call (`tel:`) and no Emergency action** in the tracking UI                    |

## UAT#10: Messaging Module

| No. | Scenario                                                 | Status | Comments                                                                                                                                               |
| --- | -------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Open the Messages list and select a conversation         | P      | `(tabs)/messages.tsx` + `(worker)/messages.tsx` → `ConversationListScreen.tsx`; RPCs `apiCore.ts:1543,1554,1709,1801`                                  |
| 2   | Send a text message and verify the recipient receives it | P      | `apiCore.ts:1655` (`send_chat_message`); optimistic layer `services/chatRealtime.ts:13`; hook `useConversationChat.ts`; RPC `20260729110000_*.sql:345` |
| 3   | Share an image and a location in the conversation        | P\*    | Paperclip button has **no `onPress`** (`app/messages/chat.tsx:290`); `send_chat_message` accepts `p_body` text only — no attachment/location path      |
| 4   | Verify message alerts appear in the notifications        | P      | Consolidated message notification `20260723070000_consolidate_chat_notifications.sql`; `app/notifications.tsx:56-80`; `apiCore.ts:1842,1862`           |

## UAT#11: Cash Payment Module

| No. | Scenario                                                                                                       | Status | Comments                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Open the payment screen for a completed booking                                                                | P      | `tracking/[id].tsx:132-134` → `app/payment/[id].tsx` (amount, method selection, footer confirm)                                                                                                                    |
| 2   | Confirm cash payment as the homeowner and verify status is awaiting worker confirmation                        | P      | `payment/[id].tsx:93` → `confirm_cash_payment` (`20260720000200_domain_rpcs.sql:119`; updated `20260722001100_platform_fees_subscriptions.sql:17`) → `AWAITING_CONFIRMATIONS`                                      |
| 3   | Confirm payment received as the worker and verify payment becomes successful                                   | P      | `(worker)/booking-request/[id].tsx:336-344`; `apiCore.ts:836` (`deduct_booking_commission`); `CompletedSummary.tsx:106-115` → SUCCESSFUL                                                                           |
| 4   | Verify the receipt shows the service amount, commission (10%), worker net amount, and homeowner charge (PHP 0) | P\*    | All four values exist in DB (`20260722001100:1-4`); the **homeowner receipt shows total only** (`booking-summary/[id].tsx:328-404`); the worker side shows "Platform Commission (10%)" (`CompletedSummary.tsx:93`) |

## UAT#12: Reviews Module

| No. | Scenario                                                                               | Status | Comments                                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the Rate & Review screen for a completed, paid booking                            | P      | `app/review/[id].tsx`; entry from booking summary Actions (`booking-summary/[id].tsx:410`)                                                                                                                                                        |
| 2   | Submit a star rating, written review, photos, and a recommendation                     | P      | `review/[id].tsx:9,26-29,72-85` (rating, comment, recommend switch, expo-image-picker upload to `review-media`); `attach_review_media` `20260721012000_client_operations.sql:3`                                                                   |
| 3   | Verify the feedback-submitted confirmation appears                                     | P\*    | Submission succeeds and navigates home (`review/[id].tsx:41-102`), but **errors are swallowed in an empty catch and there is no explicit confirmation screen**                                                                                    |
| 4   | Verify the review option is not available for bookings that are not completed and paid | P      | `create_review` raises `42501 REVIEW_NOT_ALLOWED` unless COMPLETED + payment SUCCESSFUL + owner (`20260724000000_auto_publish_reviews.sql:20-28`)                                                                                                 |
| 5   | Open the worker's Rate & Review modal and verify the feedback is read-only             | P\*    | Worker reviews are read-only (`(worker)/reviews.tsx`, `components/ReviewsTab.tsx`), but there is **no "Rate & Review" modal**; worker feedback is a separate AsyncStorage flow (`(worker)/leave-feedback/[id].tsx`, `services/workerFeedback.ts`) |

## UAT#13: Homeowner Profile & Settings

| No. | Scenario                                                       | Status | Comments                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | View and update personal profile information                   | P      | `(tabs)/profile.tsx` (name/mobile/avatar); `services/profile.ts:191-211`; `apiCore.ts:1868`                                                                                                                                  |
| 2   | Add and manage saved service addresses                         | P      | `app/settings/addresses.tsx`; `services/addresses.ts`; RPC `upsert_my_address` (`20260722001300_saved_address_management.sql:3`)                                                                                             |
| 3   | Change notification preferences and verify alerts are received | P\*    | Alerts delivered (notifications feed + realtime); **no preference UI** — `account_preferences.notifications` toggles exist in DB (`20260721000200_*.sql:26`) but are not surfaced or updated by the app                      |
| 4   | Switch the app language between Filipino and English           | P\*    | `app/settings/language.tsx` + `services/localization.ts` (`set_my_preferred_locale` `20260722001000:22`) affects **only chat-message translation** (Edge `ai-translate-message`); the app UI has no i18n and remains English |
| 5   | View booking history and account details                       | P      | `(tabs)/bookings.tsx` (all booking tabs) + profile account details                                                                                                                                                           |

## UAT#14: Worker Dashboard / Job Posts Module

| No. | Scenario                                                                   | Status | Comments                                                                                                                                                           |
| --- | -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Open the worker Dashboard / Job Posts                                      | P      | `(worker)/index.tsx` (stats, live status, earnings)                                                                                                                |
| 2   | View only requests that match the worker's skills and service area         | P      | Dispatch filters by `worker_skills` category, subdivision, `st_dwithin` radius, wave-based search (`20260723020000_live_worker_dispatch.sql:68,79-84`)             |
| 3   | Open a request and view description, photos, address, schedule, and budget | P      | `(worker)/booking-request/[id].tsx`                                                                                                                                |
| 4   | Accept a request and verify it becomes a booking                           | P      | `respondToDispatch` ACCEPTED → booking (dispatch RPC `20260730120000_*.sql:494-512`)                                                                               |
| 5   | Decline a request with a reason                                            | P\*    | Decline works, but the **reason is a hardcoded string** ("Worker declined the assigned booking", `booking-request/[id].tsx:233-247`), not a user-selectable reason |

## UAT#15: Worker Booking Management

| No. | Scenario                                            | Status | Comments                                                                                                          |
| --- | --------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Open an Accepted booking and start the service      | P      | `(worker)/booking-request/[id].tsx` (startJob action)                                                             |
| 2   | Progress the booking through the canonical statuses | P      | `prepareJob → departForJob → arriveAtJob → startJob → markJobInProgress → completeJob` (`apiCore.ts:745,916-937`) |
| 3   | Complete the job and verify status shows Completed  | P      | `completeJob` → COMPLETED (`20260731010100_*.sql:34-43`)                                                          |
| 4   | Cancel a job with a reason and confirmation         | P      | `(worker)/cancel-service/[id].tsx` + `components/CancellationConfirmation.tsx`                                    |

## UAT#16: Wallet Module

| No. | Scenario                                                                      | Status | Comments                                                                                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Open the Wallet and view the current balance and recent activity              | P      | `(worker)/wallet.tsx` balance card; `apiCore.ts:1021-1068`                                                                                                                                                                                                                                 |
| 2   | Submit a wallet top-up with payment proof and verify it is pending review     | P\*    | Top-up is **simulated only** ("Simulate Top-Up", `wallet.tsx:324-329`; `simulate_wallet_topup` `20260806200000_simulated_topup_and_commission.sql:13-69`). Real proof-upload top-up exists only as DB RPCs (`submit_manual_wallet_topup`, `admin_review_wallet_topup`) not wired to any UI |
| 3   | Add a payout destination                                                      | P\*    | Payout methods are loaded, but the payout flow is **disabled** ("unavailable until a payment provider is configured", `wallet.tsx:126-134`)                                                                                                                                                |
| 4   | Request a payout and verify it is pending                                     | P\*    | `request_payout` RPC exists (`apiCore.ts:1069-1077`) but the button is disabled                                                                                                                                                                                                            |
| 5   | Verify the balance updates after administrator approval of a top-up or payout | F      | No UI path in this repo; approval RPCs are backend-only (`admin_decide_payout` `20260721010000_production_domains.sql:425`)                                                                                                                                                                |
| 6   | Open transaction history and view payments, commissions, top-ups, and payouts | P      | `apiCore.ts:983-1020`; `(worker)/transactions-history.tsx` (search, credit/debit filter, date range)                                                                                                                                                                                       |

---

## UAT#17: Admin Login

**NVR** — no admin UI exists in this repo (`apps/admin/` is gitignored, `.gitignore:27-28`; Playwright config/test expect `localhost:5173`).

| No. | Scenario                                                                                 | Status | Comments                                                                                                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the administrator login page                                                        | NVR    | No UI. Only test expectations exist (`tests/admin-e2e/public-auth.spec.ts:4`)                                                                                                                                                                               |
| 2   | Enter valid Administrator credentials and verify redirection to the Dashboard            | NVR    | Sign-in is Supabase Auth; no admin login page source (`authenticated-admin.spec.ts:8-19`)                                                                                                                                                                   |
| 3   | Enter invalid credentials and verify an error message appears                            | NVR    | No admin error-surface code in repo                                                                                                                                                                                                                         |
| 4   | Verify that opening a protected admin route without an active session redirects to Login | NVR    | Redirect exists only as a test expectation; server-side gate is `is_admin`/`current_role` (`20260720000100_platform.sql:283-285`)                                                                                                                           |
| 5   | Verify that a suspended Administrator account cannot sign in                             | NVR    | DB-gated: `current_role`/`is_admin` require `status='ACTIVE'` (`platform.sql:280-285`); `set_account_status` (`20260720000200_domain_rpcs.sql:164-173`). Explicit session revocation only in the legacy backend (`backend/src/services/admin.service.ts:7`) |

## UAT#18: Admin Dashboard

| No. | Scenario                                                                                                               | Status | Comments                                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the Dashboard module                                                                                              | NVR    | No admin UI                                                                                                                                                                                                       |
| 2   | View the dashboard statistics for total users, workers, bookings, revenue, pending verifications, new users this month | NVR    | `admin_dashboard_metrics` (`20260721010000:442-454`), `get_admin_dashboard_metrics` (`20260721001000:611-652`), `GET /admin/dashboard` (`api/index.ts:19`). **"New users this month" is not computed by any RPC** |
| 3   | View the recent activity list of the latest audit log entries                                                          | NVR    | `audit_logs` table (`platform.sql:253-257`); `GET /admin/audit`; no dedicated recent-activity endpoint in Edge Functions (legacy only)                                                                            |
| 4   | Open navigation to the main management modules                                                                         | NVR    | Navigation exists only in guardrail/refactor-script references to `apps/admin`                                                                                                                                    |

## UAT#19: Account & Worker Management

| No. | Scenario                                                                                                              | Status | Comments                                                                                                                                                                                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the Users and Workers lists and use search and filters                                                           | NVR    | `GET /admin/users`, `/admin/workers` (`api/index.ts:19`); search/filters only in legacy backend                                                                                                                                                                                                                                    |
| 2   | Open a worker's details and view profile, industry, skills, documents, service areas, wallet, and verification status | NVR    | All data present in DB (`worker_profiles`, `worker_skills`, `worker_verifications`, `worker_verification_documents`, `wallets`); no UI                                                                                                                                                                                             |
| 3   | Approve a pending worker and verify the worker becomes available for job acceptance and receives a wallet             | NVR    | `review_worker_verification` (`20260720000200:152-162`) + `admin_activate_verified_worker` (`20260723170000:3-24`) set APPROVED/available. **A wallet is NOT created at approval** in the active DB path (lazily created by `credit_worker_wallet` trigger on first payment, `20260721010000:475-487`; legacy backend upserts one) |
| 4   | Reject a pending worker and verify a rejection reason is required and recorded                                        | NVR    | REJECTED decision recorded (`20260720000200:158`), but the **reason is not enforced in the active DB**; required only in the legacy route (`backend/src/routes/admin.routes.ts:10`)                                                                                                                                                |
| 5   | Request more documents from a worker and verify the verification status changes                                       | NVR    | `review_verification_document` (`20260721000400:46-71`) sets NEEDS_DOCUMENTS / is_available=false                                                                                                                                                                                                                                  |
| 6   | Suspend a user and verify the account cannot sign in and active sessions are revoked                                  | NVR    | `set_account_status` + DB auth gating block sign-in; **no explicit session-revocation RPC in the active path** (legacy: `admin.service.ts:7`)                                                                                                                                                                                      |
| 7   | Change a suspended user's status back to Active and verify the user can sign in again                                 | NVR    | `set_account_status` ACTIVE; `restore_from_trash` (`20260722150000:156-166`)                                                                                                                                                                                                                                                       |

## UAT#20: Booking Management Module (Admin)

| No. | Scenario                                                                  | Status | Comments                                                                                   |
| --- | ------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| 1   | Open a booking and view the customer, worker, service, and amount details | NVR    | `GET /admin/bookings` (flat list, `api/index.ts:19`); nested detail only in legacy backend |
| 2   | Filter bookings by status and verify the list updates                     | NVR    | Status filter only in legacy backend; Edge API has no status filter param                  |

## UAT#21: Financial Management Module (Admin)

| No. | Scenario                                                                                                      | Status | Comments                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Open the payment records and view amount, status, customer, booking, and refunds                              | NVR    | `payments` (`platform.sql:154-161`), `refunds` (`:173-177`); `GET /admin/payments`                                                                                                               |
| 2   | Filter payments by status and view the payment summary                                                        | NVR    | Filter + summary only in legacy backend (`admin.routes.ts:13`)                                                                                                                                   |
| 3   | View and update platform settings including the worker commission (default 10%) and the worker activation fee | NVR    | `system_settings` + `admin_set_setting` (`20260720000400:25-34`); commission 10% and homeowner charge 0 seeded (`20260722001100:1-4`). **Worker activation fee does not exist** in any migration |

## UAT#22: Services & Catalog Management

| No. | Scenario                                                                           | Status | Comments                                                                                                                             |
| --- | ---------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Add, edit, or deactivate a service category                                        | NVR    | `admin_upsert_service_category` (`20260720000700:64-108`), `admin_upsert_category` (`20260721011000:13-20`)                          |
| 2   | Add, edit, or deactivate a service and verify price, duration, and status settings | NVR    | `admin_upsert_service` (`20260721011000:1-12`), `admin_upsert_service_template` (`20260721000900:61-117`), archive `:154-175`        |
| 3   | Verify the category list shows the number of services per category                 | NVR    | Service count only in the legacy backend (`admin.service.ts:11`) and the mobile-facing `GET /categories` (`api/index.ts:8`)          |
| 4   | Verify catalog changes are reflected in the mobile catalog                         | NVR    | Shared tables guarantee propagation (mobile reads `is_active=true`); no realtime push, and the admin change requires RPC/API (no UI) |

## UAT#23: Reviews Moderation

| No. | Scenario                                                                            | Status | Comments                                                                                                                                |
| --- | ----------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the Reviews list and view review moderation status                             | NVR    | `reviews.moderation_status` (`platform.sql:179-188`); `GET /admin/reviews`                                                              |
| 2   | Reject (hide) a published review and verify it no longer appears on worker profiles | NVR    | `moderate_review(review_id,'REJECTED')` (`20260720000400:36-44`); RLS `reviews_visible_read` shows only PUBLISHED (`20260720000300:55`) |
| 3   | Publish a previously hidden review and verify it appears on worker profiles         | NVR    | `moderate_review(review_id,'PUBLISHED')`; reviews now auto-publish (`20260724000000:36-42`)                                             |

## UAT#24: Support Module

| No. | Scenario                                                                          | Status | Comments                                                                                                               |
| --- | --------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the Support module and select a ticket                                       | NVR    | `support_tickets` (`platform.sql:233-239`); `GET /admin/support`                                                       |
| 2   | Reply to a support ticket                                                         | NVR    | `send_support_message` (`20260721000200:376-390`)                                                                      |
| 3   | Update a ticket's assigned administrator, priority, or status                     | NVR    | `admin_update_support_details` (`20260721233000:303-320`); `update_support_ticket` (`20260720000400:46-57`)            |
| 4   | Escalate an unresolved ticket and verify the status changes to Escalated          | NVR    | `update_support_ticket` sets `escalated_at` (`20260720000400:52`)                                                      |
| 5   | Resolve and close a ticket, then reopen it and verify it returns to the open list | NVR    | RESOLVED/CLOSED set timestamps; reopen = same RPC with OPEN; replying to CLOSED tickets blocked (`20260721000200:385`) |

## UAT#25: Notifications Module

| No. | Scenario                                                                                                           | Status | Comments                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the Notifications module                                                                                      | NVR    | No admin UI                                                                                                                                                                       |
| 2   | Create a notification campaign and select an audience (all users, workers only, customers only, or inactive users) | NVR    | `admin_create_notification_draft` (`20260722000300:3-21`); audience enum is **USERS/WORKERS/EVERYONE only** (`platform.sql:21`); INACTIVE_USERS exists only in the legacy backend |
| 3   | Send a campaign and verify recipients receive an in-app alert                                                      | NVR    | `admin_publish_campaign` (`20260721011000:23-30`); `queue-consumer` scheduled notifications; mobile inbox `app/notifications.tsx`                                                 |
| 4   | Verify a sent campaign cannot be edited                                                                            | NVR    | Publish restricted to DRAFT/SCHEDULED (`20260721011000:26`); legacy blocks edits after send                                                                                       |

## UAT#26: Reports & Analytics

| No. | Scenario                                                                                                                        | Status | Comments                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the Reports / Analytics module                                                                                             | NVR    | No admin UI                                                                                                                                                                                                    |
| 2   | Generate a report with a date range and verify the summary counts for users, workers, bookings, completed payments, and revenue | NVR    | Edge Functions `report-export` (`index.ts:197-228`) and `report-generate`; legacy computes the exact summary counts (`admin.service.ts:24`). Note: `report-generate` is not declared in `supabase/config.toml` |
| 3   | Export a report in JSON or CSV format                                                                                           | NVR    | Active backend exports **CSV/XLSX/PDF only** (`report-export/index.ts:13-27`); JSON exists only in the legacy backend                                                                                          |
| 4   | Verify the exported file appears in the reports list and can be downloaded                                                      | NVR    | `report_exports` table + `report-exports` bucket (`20260720000300:85,107`); **no signed-URL/download endpoint in Edge Functions** (download only in legacy `admin.routes.ts:16`)                               |

## UAT#27: System Settings

| No. | Scenario                                                   | Status | Comments                                                                                                       |
| --- | ---------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| 1   | Open the Settings module and view the configured settings  | NVR    | No admin UI                                                                                                    |
| 2   | Change a setting and save it                               | NVR    | `admin_set_setting` (`20260720000400:25-34`); Edge API only exposes `GET /admin/settings` (no update endpoint) |
| 3   | Verify the saved value persists after reloading the module | NVR    | Persistence guaranteed by `system_settings`; read by `get_platform_fee_settings` (`20260722001100:6-12`)       |

## UAT#28: Audit Log, Trash & Restore

| No. | Scenario                                                                                | Status | Comments                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the Audit Log and view actor, action, entity, and timestamp                        | NVR    | `audit_logs` columns `actor_id, action, entity_type, entity_id, created_at` (`platform.sql:253-257`); `GET /admin/audit`                     |
| 2   | Open the Trash and view deleted records                                                 | NVR    | `trash_entries` (`platform.sql:248-252`); `move_to_trash` (`20260720000200:196-204`); `admin_soft_delete_account` (`20260722150000:109-116`) |
| 3   | Restore a deleted user record and verify it returns to its module                       | NVR    | `restore_from_trash` supports `user` (`20260722150000:125-184`)                                                                              |
| 4   | Verify restoring a record of an unsupported entity type is blocked with a clear message | NVR    | Else-branch raises `TRASH_ENTITY_RESTORE_NOT_ALLOWED` (`20260722150000:171-173`)                                                             |

## UAT#29: Logout

| No. | Scenario                                                              | Status | Comments                                                                                             |
| --- | --------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| 1   | Select Logout                                                         | P      | `(tabs)/profile.tsx:368-378` (handler `:171-176`); worker variant `(worker)/profile.tsx:249-250,581` |
| 2   | Verify the active session is cleared                                  | P      | `supabase.auth.signOut()` (`profile.tsx:172`) + store reset (`store/useAuthStore.ts:30`)             |
| 3   | Verify the user is redirected to the Login page                       | P      | `router.replace('/')` (`profile.tsx:174`) → root guard `index.tsx:17-19` → `/(auth)/login`           |
| 4   | Verify accessing protected pages after logout redirects back to Login | P      | `_layout.tsx:95-96`; tab guard `(tabs)/_layout.tsx:46`                                               |

---

## Overall UAT Results

Total scenarios in `checkuat.md`: **131** (UAT#1–16 = 79, UAT#17–28 = 48, UAT#29 = 4).

| Category                                              | Count   |
| ----------------------------------------------------- | ------- |
| `P` — fully implemented and testable                  | 52      |
| `P*` — partial                                        | 26      |
| `F` — not implemented                                 | 5       |
| `NVR` — not verifiable in this repo (admin UI absent) | 48      |
| **Total**                                             | **131** |

**Verifiable in this repo (mobile + logout):** 83 scenarios → 52 P, 26 P\*, 5 F.

- Strict pass rate (P only): **62.7%** of verifiable scenarios.
- Pass rate including partials (P + P\*): **94.0%** of verifiable scenarios.
- Admin (48 scenarios): all **NVR** — backend/DB support exists for most, but no admin UI is present in this repository.

## Remaining Risks & Validation Notes

1. This report is a **static codebase verification**. It confirms features exist and where, but does not prove end-to-end behavior. Live execution (mobile simulator/web, `pnpm dev`, `pnpm test:e2e`) and on-device flows are still required before these statuses can be treated as executed UAT results.
2. **Admin modules are unverifiable in this repo.** `apps/admin` is gitignored; the admin E2E specs in `tests/admin-e2e/` and `playwright.config.ts` target a missing app. Until the admin source is included, UAT#17–28 cannot be executed here.
3. The Edge Function `api` and `report-generate` are not declared in `supabase/config.toml` (deployment caveat, not evidence of missing code).
4. Several legacy-backed behaviors (search/filters, session revocation, JSON reports, report download, worker activation wallet, rejection-reason enforcement) exist only in the non-active `backend/` and would be lost if it is removed.
5. Known functional gaps to prioritize: `/search` route, pre-booking messaging, comparison view, customer-side cancellation + pre-confirm refund policy, budget/notes inputs, schedule pickers, success confirmation screen, Call/Emergency tracking actions, chat attachments, itemized homeowner receipt, notification-preference UI, app language i18n, and real (non-simulated) wallet top-up/payout.
