# UI Component and Source-Parity Manifest

This manifest records the original pre-merge route mapping. The approved frontend source now exists directly in `apps/admin` and `apps/mobile`; references below to porting into Next.js or older Expo route names are historical and are superseded by `MERGE_REPORT.md` and the current filesystem.

## Reference authority

| Interface     | Supplied source                                             | Target                                           | Rule                                                                                                                                      |
| ------------- | ----------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Administrator | `admin-webapp`                                              | `apps/admin`                                     | Preserve the approved Vite/React Router application and connect its service layer to Supabase. Synthetic business records are prohibited. |
| User          | `newuserfrontend`                                           | `apps/mobile/app/(user)` plus shared Auth routes | Port every route, shared primitive, state and navigation pattern into Expo Router. Operational content must come from Supabase.           |
| Worker        | `A-yos-Project-workerfrontend-refactor` unified application | `apps/mobile/app/(worker)`                       | Preserve the approved unified customer/worker Expo routes and connect them to Supabase.                                                   |

X and Apple authentication are intentionally removed by explicit instruction. Google is the sole social-authentication control.

## Administrator route inventory

| Source route/page                            | Target route               | Required UI and controls                                                                              | Backend authority                                         | Status                                |
| -------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------- |
| `/login` / `Login.jsx`                       | `/login`                   | Split authentication card, password visibility, remember state, recovery, loading/error/success       | Supabase Auth, SSR cookies, MFA routes                    | Integrated; browser tested            |
| `/admin/dashboard` / `Dashboard.jsx`         | `/dashboard`               | Header filters, metric cards, operational chart, recent activity, pending-worker actions              | RLS counts, booking/payment/verification/audit data       | Integrated; authenticated E2E pending |
| `/admin/users` / `Users.jsx`                 | `/dashboard/accounts`      | Search, filters, export, invite, details, status, soft delete, pagination                             | `accounts`, status RPC, invite function, deletion RPC     | Integrated; authenticated E2E pending |
| `/admin/workers` / `Workers.jsx`             | `/dashboard/workers`       | Tabs, search, filter, verification drawer, approve/reject/request documents, priority, invite, delete | Worker/profile/verification tables and protected RPCs     | Integrated; authenticated E2E pending |
| `/admin/bookings` / `Bookings.jsx`           | `/dashboard/bookings`      | Status tabs, search/filter, details timeline, supported transitions and cancellation                  | Booking/request/event/payment reads, `transition_booking` | Integrated; authenticated E2E pending |
| `/admin/services` / `Services.jsx`           | `/dashboard/services`      | Service/category tabs, metrics, create/edit/duplicate/toggle/archive, search/filter/pagination        | Service templates and category RPCs                       | Integrated; pgTAP tested              |
| `/admin/payments` / `Payments.jsx`           | `/dashboard/finance`       | Metrics, method cards, transactions, payouts, refunds, filters, details, export                       | Payment/wallet/payout/refund tables and RPCs              | Integrated; authenticated E2E pending |
| `/admin/reviews` / `Reviews.jsx`             | `/dashboard/reviews`       | Metrics, search/filter, details, publish/hide/archive                                                 | `reviews`, `moderate_review`, trash commands              | Integrated; authenticated E2E pending |
| `/admin/support` / `Support.jsx`             | `/dashboard/support`       | Ticket table/detail, thread, attachment affordance, reply, escalate, resolve/reopen                   | Support ticket/message reads and RPCs                     | Integrated; authenticated E2E pending |
| `/admin/reports` / `Reports.jsx`             | `/dashboard/reports`       | Report filters, generate, progress, CSV/XLSX/PDF download, print-friendly result                      | `report-export`, private Storage                          | Integrated; authenticated E2E pending |
| `/admin/analytics` / `Analytics.jsx`         | `/dashboard/analytics`     | Date filters, aggregate cards and charts                                                              | Real database aggregates only                             | Integrated; authenticated E2E pending |
| `/admin/notifications` / `Notifications.jsx` | `/dashboard/communication` | Audience composer, schedule, history, status/filter/pagination                                        | Notification RPC, queue and delivery records              | Integrated; authenticated E2E pending |
| `/admin/auditlogs` / `AuditLogs.jsx`         | `/dashboard/audit`         | Search, action/date filters, details and pagination                                                   | `audit_logs`                                              | Integrated; authenticated E2E pending |
| `/admin/trash` / `Trash.jsx`                 | `/dashboard/trash`         | Entity tabs, search, restore, restore all, permanent delete, empty trash                              | Trash RPCs with AAL2 and typed confirmation               | Integrated; pgTAP tested              |
| `/admin/settings` / `Settings.jsx`           | `/dashboard/settings`      | General/content/security/notification settings, save/discard, MFA                                     | Content/settings RPCs and MFA routes                      | Integrated; authenticated E2E pending |
| `/admin/profile` / `Profile.jsx`             | `/dashboard/profile`       | Avatar/profile form, credentials, sessions, revoke and activity                                       | Profile/Auth/session-history operations                   | Integrated; authenticated E2E pending |

## Administrator shared-component inventory

| Source component                                               | Target adaptation                                                               | Status                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------ |
| `AdminLayout`, `AdminSidebar`, `AdminNavbar`, `CommandPalette` | Persistent responsive App Router shell with keyboard-operable navigation/search | Integrated               |
| `Button`, `Input`, `Card`, `Badge`, `Table`                    | Typed accessible primitives using the reference tokens                          | Integrated               |
| `Modal`, `Drawer`                                              | Focus-managed client components with Escape/backdrop handling                   | Integrated               |
| `Pagination`, `Skeleton`, `DashboardCard`                      | Reusable server/client presentation components                                  | Integrated               |
| `ToastContext`                                                 | Accessible success/error status region driven by real mutations                 | Adapted to inline status |
| `ProtectedRoute`, fake `AuthContext`, `useFakeLoading`         | Do not copy; replaced by SSR Auth, role/AAL checks, and actual pending states   | Replaced by architecture |

## User route inventory

| Source route                         | Target route                       | Required UI/interaction                                                           | Backend authority                                        | Status                                |
| ------------------------------------ | ---------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------- |
| Landing                              | `/landing`                         | Hero, role entry and sign-in/register navigation                                  | Auth session                                             | Integrated; browser tested            |
| Login                                | `/(auth)/login`                    | Email sign-in, visibility, recovery, Google-only OAuth                            | Supabase Auth and `get_my_profile`                       | Integrated; authenticated E2E pending |
| Register                             | `/register`                        | Role-fixed form, terms, friendly validation, password checklist                   | Contracts and Auth `signUp`                              | Integrated; browser tested            |
| OTP                                  | `/verify`                          | Six-digit input, expiry, resend, pending/error/success                            | Auth verify/resend                                       | Integrated; authenticated E2E pending |
| Home tab                             | `/(user)`                          | Header, alerts/avatar, categories, AI/promotion cards, recommendations            | Categories, promotions, approved workers and reviews     | Integrated; authenticated E2E pending |
| Activity tab                         | `/(user)/bookings`                 | Grouped booking statuses, empty/loading cards and details navigation              | Booking/request/payment reads                            | Integrated; authenticated E2E pending |
| Create tab                           | `/(user)/request`                  | Elevated center action into complete request wizard                               | Request RPCs                                             | Integrated; authenticated E2E pending |
| Messages tab                         | `/(user)/messages`                 | Conversation list, unread state and empty state                                   | Conversation/message tables and Realtime                 | Integrated; authenticated E2E pending |
| Account tab                          | `/(user)/profile`                  | Profile header and complete persisted menu                                        | Profile/address/favorite/preference/support/payment data | Integrated; authenticated E2E pending |
| Category detail                      | `/(user)/browse`                   | Search/filter/sort, category and worker cards, favorite/details                   | Approved worker directory reads                          | Integrated; authenticated E2E pending |
| Request create/summary/radius/budget | `/(user)/request`                  | Staged issue, media, address/map, schedule, radius and budget state               | Storage, addresses, AI and request RPC                   | Integrated; authenticated E2E pending |
| Matching                             | `/(user)/offers` and request state | Progress, no-match, candidate compare, message/select/offer actions               | Match/offer/conversation/selection RPCs                  | Integrated; authenticated E2E pending |
| Notifications                        | `/(user)/alerts`                   | Grouped list, unread indicator, mark read and live updates                        | Notifications and Realtime                               | Integrated; authenticated E2E pending |
| Chat                                 | `/(user)/conversation`             | History, composer, image/location attachment, contact and eligible booking action | Messages, Storage, Realtime and booking data             | Integrated; authenticated E2E pending |
| Tracking                             | `/(user)/tracking`                 | Map, worker/service state, route/ETA and permission/error states                  | Tracking/map RPCs and Realtime                           | Integrated; provider E2E pending      |
| Payment/success                      | `/(user)/payment`                  | Real totals, Cash-only dual confirmation, pending/success and receipt             | Cash payment RPC and receipts                            | Integrated; authenticated E2E pending |
| Review                               | `/(user)/review`                   | Stars, text, recommendation, media, eligibility/moderation state                  | Review/media RPCs                                        | Integrated; authenticated E2E pending |

## User shared-component and asset inventory

| Source item                                   | Target adaptation                                                                                            | Status                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `Screen`, `Button`, `TextInput`, `EmptyState` | Consolidate into shared typed Expo primitives with source spacing, radius, shadows and accessibility         | Integrated                                           |
| Source theme                                  | Adopt primary blue, semantic colors, complete typography scale, spacing, radii, shadows and animation values | Integrated                                           |
| Bottom tabs and elevated create button        | Preserve five-position navigation and animated central request action                                        | Integrated                                           |
| Supplied local assets                         | Copy only used assets into the target asset tree                                                             | Audited; no required local operational asset omitted |
| Remote worker/content images                  | Replace operational images with authenticated profile/media URLs; retain only verified decorative content    | Backend-driven                                       |
| X and Apple icons/buttons                     | Remove completely, including layout gaps and accessibility nodes                                             | Explicitly excluded                                  |
| Legacy fixed OTP, mock Auth store and timers  | Removed; repository regression checks reject their return                                                    | Replaced by Supabase Auth                            |

## Parity acceptance

- No route is complete until its source structure, responsive behavior, controls, backend data, loading, empty, success and error states have evidence.
- No source control may disappear except X and Apple authentication.
- A credential-dependent control remains visually present and disabled with a reason only when it exists in the supplied interface and has not been explicitly retired.
- Current backend-supported functionality absent from the prototypes remains available using the same design system.
