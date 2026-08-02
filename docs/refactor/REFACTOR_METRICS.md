# Repository Refactor Metrics

## Final Metrics

| Metric                                   | Actual count | Method                                                                                        |
| ---------------------------------------- | -----------: | --------------------------------------------------------------------------------------------- |
| Total in-scope tracked files             |          997 | Tracked files excluding lockfile internals and generated caches/build output                  |
| Total source files                       |          884 | Tracked TS/TSX/JS/JSX/MJS/CJS/CSS/SQL/Prisma files                                            |
| Total routes                             |           61 | Expo Router files under `apps/mobile/app`                                                     |
| Total screens/pages                      |          167 | Admin pages and explicit screen directories                                                   |
| Total components                         |           65 | Component directories                                                                         |
| Total hooks                              |           80 | Hook directories                                                                              |
| Total services                           |           74 | Service directories                                                                           |
| Total repositories                       |            2 | Repository directories                                                                        |
| Total contexts/providers                 |            3 | Context directories                                                                           |
| Total utility files                      |           12 | Utility and lib directories                                                                   |
| Files over 100 lines                     |          261 | Physical line count                                                                           |
| Files over 150 lines                     |          188 | Physical line count                                                                           |
| Files over 300 lines                     |           73 | Physical line count                                                                           |
| Files containing database calls          |           90 | Supabase/from/RPC/Auth/Storage patterns                                                       |
| Files containing direct API calls        |           17 | fetch/axios/functions.invoke patterns                                                         |
| Files containing StyleSheet.create       |           90 | React Native StyleSheet pattern                                                               |
| Files with hardcoded colors              |           36 | Hex-color tokens                                                                              |
| Files containing any                     |           67 | TypeScript/JavaScript word occurrence; includes comments/strings                              |
| Files containing TypeScript suppressions |            1 | @ts-ignore or @ts-expect-error                                                                |
| Files containing disabled lint rules     |            0 | ESLint/Oxlint disable directives                                                              |
| Supabase createClient initializations    |           11 | createClient call occurrences; separate surface/helper clients may be intentional             |
| Confirmed duplicate mobile auth sources  |            0 | Mobile canonical Zustand auth store; Admin AuthContext is a separate surface                  |
| Confirmed duplicate component families   |            0 | Canonical AppButton/AppInput implementations with temporary prop adapters                     |
| Confirmed duplicate hook families        |            0 | Static/manual evidence baseline                                                               |
| Duplicate database-query candidates      |           60 | Repeated table access across files; requires semantic review                                  |
| Circular dependency cycles               |            0 | Resolved local static import graph                                                            |
| Unused source-file candidates            |          116 | No inbound static imports after excluding entries, routes, tests, configs, and public indexes |

Counts are measured, not estimated. Candidate metrics are explicitly heuristic and do not authorize removal.

## Baseline-to-Final Comparison

The baseline was captured before application edits. A larger service/hook count is expected because monoliths were decomposed into focused responsibility files.

| Metric                                 | Baseline | Final |
| -------------------------------------- | -------: | ----: |
| Total hooks                            |        5 |    80 |
| Total services                         |       30 |    74 |
| Total repositories                     |        1 |     2 |
| Files over 300 lines                   |       78 |    73 |
| Files containing database calls        |       78 |    90 |
| Files containing direct API calls      |       18 |    17 |
| Files containing StyleSheet.create     |       92 |    90 |
| Confirmed duplicate component families |        2 |     0 |
| Circular dependency cycles             |        0 |     0 |
