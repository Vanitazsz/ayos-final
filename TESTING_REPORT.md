# Testing Report

## Executed verification

| Check                                 | Result                     | Evidence                                                                                                                                                                              |
| ------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace structure and secret scan   | Passed                     | `pnpm verify:stack`                                                                                                                                                                   |
| Formatting                            | Passed                     | `pnpm format:check`                                                                                                                                                                   |
| Fresh lint, TypeScript and unit tasks | Passed                     | Root workspace lint, typecheck, and package tests; approved client lint reports warnings only                                                                                         |
| Unit/integration tests                | Passed                     | Workspace package tests completed without failure                                                                                                                                     |
| Edge Functions                        | Passed                     | All configured functions passed Deno check; 2 retained Expo Push contract tests passed                                                                                                |
| Database replay                       | Passed                     | Clean local reset replayed every migration through `20260722000400_single_role_accounts.sql` and the seed                                                                             |
| Database pgTAP                        | Passed                     | 248/248 assertions across 9 files, including immutable roles, taxonomy/onboarding validation, profiles, Storage, RLS, domain workflows, and existing guards                           |
| Database lint                         | Application schemas passed | The CLI returned vendor PostGIS `extensions` findings only; no application-owned `public` or `private` function error was reported                                                    |
| Production builds                     | Passed                     | Approved Vite Admin build and Expo web export                                                                                                                                         |
| Worker taxonomy browser acceptance    | Passed                     | Playwright verified 10 live hosted industries, searchable industry/skill selection, no custom values, and phone/desktop layout                                                        |
| Service search/request continuation   | Passed                     | 11 Playwright checks verified Home/request search, pagination, selection retention, geocoded and GPS confirmation, provider failure, consent, continuation, and responsive boundaries |
| Customer Help and Privacy pages       | Passed                     | Clean migration replay, 9 focused pgTAP assertions, and 6 Playwright checks cover Supabase content, navigation, role guards, retry/unavailable states, and responsive scrolling       |
| Hosted taxonomy deployment            | Passed                     | Isolated migrations `20260722000500`–`00600`; 10 industries/50 skills, foreign keys, RPC hardening, and original UUID preservation verified                                           |
| Hosted Help and Privacy deployment    | Passed                     | Isolated migration `20260723120000` replaced only the two `local-1` placeholders, preserved both UUIDs, published version `2026-07-23`, and recorded the exact migration as applied   |
| Hosted schema continuity              | Passed                     | Restricted schema/data/role backup captured; linked `public,storage` comparison against every canonical migration returned an empty (zero-byte) diff                                  |
| Hosted identity persistence           | Passed                     | Backup inventory contains 4 Auth users and 4 matching account rows; both clients target `qsurouiyvisykjkgjqmz` with persistent Supabase Auth sessions                                 |
| Requirements traceability             | Passed                     | FR-01–FR-104 and NFR-01–NFR-18 present                                                                                                                                                |
| Frontend/backend contract audit       | Passed                     | Every literal frontend RPC, Edge Function, table/view, and Storage bucket reference resolves in backend source                                                                        |

## Functional evidence

- Admin public Auth: labels, password visibility contract, recovery control, sign-in control, protected-dashboard redirect and phone-width overflow.
- Mobile public Auth: role-preserving registration navigation, Philippine mobile validation, password checklist errors, Google-only social control and absence of X/Apple accessibility nodes.
- Backend security: wrong-role, wrong-owner, missing-AAL2, invalid confirmation, retained-reference, restore, archive, duplicate and success paths.
- Build/type evidence covers every integrated Admin route and User/Worker Expo route. It proves compilation and contracts, not live provider acceptance.
- Responsive browser evidence covers 390×844, 768×1024 and desktop layouts for public entry/Auth surfaces, plus the authenticated Admin dashboard and mobile navigation drawer.
- Authenticated customer browser fixtures verify live service filtering, See more controls, no-result/clear states, geocoded/GPS location confirmation, reverse-provider failure recovery, specific validation, AI consent, and manual/AI continuation without adding production mock data.

## Resolved defects

| Defect                                                                  | Resolution                                                                                   | Retest                                           |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Raw Zod issue arrays and regex patterns appeared in registration        | Added field-level normalization/error mapping and a live password checklist                  | Mobile unit tests and Playwright passed          |
| Local `09…` and `63…` Philippine mobile formats failed E.164 validation | Normalize both formats to `+63…` before parsing/submission                                   | Unit tests passed                                |
| X and Apple remained in the supplied prototype                          | Removed their UI/provider paths; retained one capability-gated Google control                | Source scan and Playwright absence checks passed |
| Customer and Worker funding used active PayMongo paths                  | Retired customer GCash and provider functions; added Cash-only settlement and manual top-ups | Migration replay, Deno and pgTAP passed          |
| Service-template, invitation and Trash controls lacked contracts        | Added audited AAL2 RPCs, RLS, invitation function and allowlisted typed destructive commands | Full database pgTAP suite passed                 |
| SQL Editor installer omitted current compatibility migrations           | Added all compatibility migrations, ending with permanent single-role enforcement            | Installer generation and clean replay passed     |

## Remaining acceptance gaps

- Authenticated User and Worker browser fixtures were not available. The authenticated Admin shell and drawer passed, but complete AAL2 Admin mutation workflows are **Insufficient data to verify**.
- Direct pixel comparison against independently running supplied source applications is **Insufficient data to verify**; the integrated final-state screenshot baselines passed at the tested viewports.
- Native device permission dialogs and binaries, hosted SMTP, Google OAuth credentials, live Gemini/OpenAI/OpenRouteService/Translation/Expo Push providers, production legal content, browser/device acceptance, backup restoration, RPO and RTO are **Insufficient data to verify**.
- Provider-gated controls intentionally remain disabled with a readable reason until their verified credentials/contracts exist.
- The full local pgTAP command currently stops in the unrelated `live_dispatch_schema_contract.test.sql` because PostgreSQL rejects its `name[] = text[]` assertion. The new Help/Privacy test passes independently; the unrelated dispatch test was not changed.

## Final classification

The approved Admin and unified customer/worker frontends are integrated with hosted Supabase project `qsurouiyvisykjkgjqmz`. The canonical `public` and Storage schemas have zero diff from the hosted project, and Auth identities are stored remotely for login from another device. Production provider and native acceptance remains blocked by unavailable authenticated fixtures/native devices, missing provider credentials, and final policy content.
