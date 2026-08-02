# Repository Refactor Metrics

## Baseline Metrics

| Metric                                   | Actual count | Method                                                                                        |
| ---------------------------------------- | -----------: | --------------------------------------------------------------------------------------------- |
| Total in-scope tracked files             |          626 | Tracked files excluding lockfile internals and generated caches/build output                  |
| Total source files                       |          513 | Tracked TS/TSX/JS/JSX/MJS/CJS/CSS/SQL/Prisma files                                            |
| Total routes                             |           61 | Expo Router files under `apps/mobile/app`                                                     |
| Total screens/pages                      |           19 | Admin pages and explicit screen directories                                                   |
| Total components                         |           65 | Component directories                                                                         |
| Total hooks                              |            5 | Hook directories                                                                              |
| Total services                           |           30 | Service directories                                                                           |
| Total repositories                       |            1 | Repository directories                                                                        |
| Total contexts/providers                 |            4 | Context directories                                                                           |
| Total utility files                      |           12 | Utility and lib directories                                                                   |
| Files over 100 lines                     |          210 | Physical line count                                                                           |
| Files over 150 lines                     |          159 | Physical line count                                                                           |
| Files over 300 lines                     |           78 | Physical line count                                                                           |
| Files containing database calls          |           78 | Supabase/from/RPC/Auth/Storage patterns                                                       |
| Files containing direct API calls        |           18 | fetch/axios/functions.invoke patterns                                                         |
| Files containing StyleSheet.create       |           92 | React Native StyleSheet pattern                                                               |
| Files with hardcoded colors              |           31 | Hex-color tokens                                                                              |
| Files containing any                     |           66 | TypeScript/JavaScript word occurrence; includes comments/strings                              |
| Files containing TypeScript suppressions |            1 | @ts-ignore or @ts-expect-error                                                                |
| Files containing disabled lint rules     |            0 | ESLint/Oxlint disable directives                                                              |
| Supabase createClient initializations    |           11 | createClient call occurrences; separate surface/helper clients may be intentional             |
| Confirmed duplicate mobile auth sources  |            0 | Mobile canonical Zustand auth store; Admin AuthContext is a separate surface                  |
| Confirmed duplicate component families   |            2 | Button and input primitive pairs                                                              |
| Confirmed duplicate hook families        |            0 | Static/manual evidence baseline                                                               |
| Duplicate database-query candidates      |           52 | Repeated table access across files; requires semantic review                                  |
| Circular dependency cycles               |            0 | Resolved local static import graph                                                            |
| Unused source-file candidates            |          107 | No inbound static imports after excluding entries, routes, tests, configs, and public indexes |

Counts are measured, not estimated. Candidate metrics are explicitly heuristic and do not authorize removal.
