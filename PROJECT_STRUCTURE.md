# Project Structure

```text
A-YOS/
├── apps/
│   ├── mobile/                 Expo User/Worker application, MapLibre views, Supabase repositories, catalog search, and published content pages
│   └── admin/                  Approved Vite/React administrator dashboard
├── packages/
│   ├── contracts/              Shared validation, enums, errors, and event payloads
│   ├── domain/                 Pure booking, matching, payment, and review rules
│   ├── supabase/               Generated database types, Storage paths, Realtime topics
│   ├── config/                 Public/provider configuration validation
│   ├── observability/          Redaction and structured-log helpers
│   └── test-utils/             Shared test builders
├── supabase/
│   ├── config.toml             Local Auth, Storage, Realtime, and Edge settings
│   ├── migrations/             Authoritative schema, RPC, RLS, Storage, queue migrations
│   ├── functions/              AI, maps, reports, Auth, invitations, provider, payment, and queue functions
│   ├── tests/database/         pgTAP security and invariant tests
│   ├── sql-editor-install.sql  Generated clean-project installer
│   └── seed.sql                Stable Help/Privacy content plus local-only Terms/Refund placeholders; production changes use additive migrations
├── tests/                      Platform, security, traceability, and E2E suites, including worker taxonomy and service-grid expansion
├── playwright.config.ts        Admin and Expo web executable browser smoke configuration
├── scripts/                    Bootstrap, traceability, local Supabase, stack, and CI Shell tooling
├── infra/admin.Dockerfile      Optional administrator container build
└── required Markdown files    Synchronized project documentation
```

## Responsibilities and dependencies

- Supabase SQL migrations are the only schema authority. Every exposed table enables RLS.
- Expo and the Vite administrator application use `@supabase/supabase-js`; neither receives the secret key.
- Customer Help Center and Privacy Policy screens read published `content_pages` rows and remain inside the immutable User tab-role boundary.
- The administrator application validates the Supabase session, administrator role, persisted profile, and MFA factors before protected navigation.
- Atomic business changes use RPC functions. Edge Functions are limited to credentials, providers, reports, mobile-identifier sign-in, and job consumption.
- PGMQ/Cron replaces external Redis workers. Private Broadcast topics replace Socket.IO.

## Conventions

- Database identifiers use unquoted `snake_case`; TypeScript uses `camelCase`; shared enums retain canonical uppercase values.
- Storage paths start with the authenticated account UUID. Application buckets are private.
- Realtime topics use `booking:<id>:status`, `booking:<id>:location`, `conversation:<id>:messages`, and `user:<id>:notifications`.
- Sensitive RPCs use fixed search paths, transactions, role/ownership checks, idempotency, and stable domain errors.
- `packages/supabase/src/database.generated.ts` is regenerated after every migration and checked in CI.

## Requirement mapping

- Identity: Auth configuration, account provisioning trigger, Expo session provider, Vite administrator Auth context, and Supabase MFA.
- Worker/discovery: `industries` and `service_categories`, worker primary-industry/skill relationships, verification RPCs, availability policies, and deterministic matching RPC.
- Booking/payment/review: transactional domain RPC migration plus pure-domain tests.
- Communication/location: PostGIS RPCs and GiST indexes, MapLibre native/web views, participant RLS, private Storage, and private Realtime Broadcast.
- Administration: AAL2 admin RPCs, audit tables, dashboard server queries, report Edge Function.
- Account deletion: confirmation client component, server action, guarded AAL2 RPC, hosted SQL patch, and pgTAP transaction/rollback tests.
- Provider workflows: Gemini-primary/OpenAI-fallback queued analysis, OpenRouteService geocoding/routes, fail-closed Edge Functions, and PGMQ consumers.
