# Project Structure

## Backend workspace

```text
/Users/jhonfiel/Documents/A-YOS/
├── README.md and mandatory architecture/operations documents
├── package.json                 # Local DB, type, lint, function, smoke commands
├── packages/client/
│   └── src/database.types.ts    # Generated local schema types
├── scripts/
│   └── smoke-supabase.mjs       # Disposable local Auth/API/RLS/Storage test
├── supabase/
│   ├── config.toml              # Local services, ayos callback, JWT function policy
│   ├── seed.sql                 # Stable idempotent service taxonomy only
│   ├── migrations/
│   │   ├── 20260714...          # Seven authoritative hosted baseline versions
│   │   ├── 20260721010000_production_domains.sql
│   │   ├── 20260721011000_admin_operations.sql
│   │   └── 20260721012000_client_operations.sql
│   ├── migrations_archive/
│   │   └── incompatible-local-draft-2026-07-21/  # Never deploy
│   └── functions/
│       ├── deno.json / deno.lock
│       ├── _shared/             # HTTP, Supabase context, AI, JSON provider, geocoding
│       ├── api/
│       ├── ai-analyze-request/
│       ├── ai-process-job/
│       ├── ai-translate-message/
│       ├── ai-review-insights/
│       ├── ai-provider-health/
│       ├── ai-recommendation/   # Authenticated retired endpoint
│       ├── geocode-search/
│       ├── geocode-reverse/
│       ├── route/
│       └── report-generate/
└── backups/2026-07-21-production-baseline/  # Sensitive and git-ignored
```

## Administrator workspace

```text
/Users/jhonfiel/Downloads/A-yos-Project-main/admin-webapp/
├── src/context/AuthContext.jsx       # Supabase session + admin validation
├── src/lib/supabase.js               # Hosted client
├── src/services/adminData.js         # Real data/view-model service
├── src/pages/auth/Login.jsx
├── src/pages/admin/                  # Dashboard and all operational modules
├── src/components/                   # Approved shared UI
├── src/layouts/AdminLayout.jsx
├── .env                              # Ignored publishable configuration
└── package.json                      # Vite/build/oxlint
```

## Unified Expo workspace

```text
/Users/jhonfiel/Downloads/A-yos-Project-workerfrontend-refactor/
├── app/
│   ├── (auth)/                       # Email, recovery, Google callback flow
│   ├── (tabs)/                       # Customer tabs
│   ├── (worker)/                     # Worker routes
│   ├── new-request/                  # Capture, consent, AI/manual, schedule, match
│   ├── booking/, request/, tracking/, payment/, review/, chat/, messages/
│   └── _layout.tsx                   # Session bootstrap/navigation
├── components/
│   ├── maps/MapSurface.tsx           # Native MapLibre
│   ├── maps/MapSurface.web.tsx       # Web MapLibre GL
│   └── approved application UI
├── services/
│   ├── api.ts                        # RLS/RPC/Function view-model adapters
│   ├── auth.ts                       # Supabase Auth/OAuth
│   ├── uploads.ts                    # Private UUID Storage uploads
│   └── workerApplication.ts
├── lib/supabase.ts                   # AsyncStorage/AppState/PKCE client
├── store/                            # Zustand auth/request/booking projections
├── context/                          # Existing UI state patterns
├── types/                            # AI/media contracts
├── app.json                          # ayos, com.ayos.app identity
└── .env                              # Ignored publishable configuration
```

## Important ownership rules

- Only `supabase/migrations` is deployable migration history.
- Generated `database.types.ts` changes after schema changes.
- Shared Edge code must remain provider-secret safe and Deno-checkable.
- Frontend services map rows; components do not receive service-role credentials or provider keys.
- Backup files may contain sensitive Auth/Storage data and must remain ignored/protected.
## Real-profile additions

- `supabase/migrations/20260721233000_real_profiles_zero_mock_records.sql` — additive profile schema, RPCs, RLS, and Storage policies.
- `supabase/migrations/20260721235500_auth_profile_consistency.sql` — Auth email-confirmation/account-email synchronization trigger and safe status backfill.
- `supabase/functions/record-auth-session/` — authenticated server-derived login activity.
- Expo `services/profile.ts` — strict profile types, RPC integration, signed avatar URLs, uploads, and password updates.
- Admin `src/services/profileData.js` — real administrator profile, Auth/MFA, avatar, and event integration.
- Each frontend `scripts/check-no-production-mocks.mjs` — release regression gate.
