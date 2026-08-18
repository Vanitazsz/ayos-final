# 06 — Verify Full Pipeline

## Objective

Run the complete verification pipeline to confirm all changes from specs 01–05 are correct and nothing is broken.

## Background

After creating iOS build configs, removing EAS traces, deleting the extracted backend, removing orphaned files, and cleaning stale references, the full toolchain must be validated.

## Verification Steps

Run each command from the repo root unless otherwise noted.

### 1. Install dependencies (clean state)

```bash
rm -rf node_modules apps/mobile/node_modules packages/*/node_modules tests/*/node_modules
pnpm install
```

**Expected:** Clean install succeeds with no errors.

### 2. Typecheck all packages

```bash
pnpm typecheck
```

**Expected:** Passes across all workspace packages (mobile, packages/*, tests/*).

### 3. Lint

```bash
pnpm lint
```

**Expected:** Passes. Resolves to `eslint.config.mjs` (the only ESLint config at root).

### 4. Format check

```bash
pnpm format:check
```

**Expected:** Passes.

### 5. Mobile app unit tests

```bash
pnpm --dir apps/mobile test
```

**Expected:** All vitest tests pass.

### 6. Mobile typecheck

```bash
pnpm --dir apps/mobile typecheck
```

**Expected:** Passes with no errors. Confirms `tsconfig.json` change (nativewind removal) is clean.

### 7. Mobile mock guard

```bash
pnpm --dir apps/mobile check:no-mocks
```

**Expected:** Passes.

### 8. Functions check (Deno)

```bash
pnpm functions:check
```

**Expected:** Deno type-checks all Edge Functions successfully.

### 9. Functions tests (Deno)

```bash
pnpm functions:test
```

**Expected:** All Edge Function tests pass.

### 10. Database tests

```bash
# Requires local Supabase running
pnpm supabase:start
pnpm db:reset
pnpm db:lint
pnpm test:db
```

**Expected:** All pgTAP tests pass, lint clean.

### 11. Traceability check

```bash
pnpm traceability:check
```

**Expected:** Requirements catalog validation passes.

### 12. Build

```bash
pnpm build
```

**Expected:** Turborepo build completes across all packages.

### 13. Verify no stale references remain

```bash
grep -r "\.next" turbo.json .gitignore vitest.config.ts eslint.config.mjs
grep -r "EAS\|eas-cli\|EXPO_PUBLIC_EAS" . --include='*.json' --include='*.md' --include='*.yaml' --include='*.env*'
grep -r "nativewind" apps/mobile/tsconfig.json
ls backend/ infra/ package-lock.json hosted-backups/ 2>&1
ls eslint.config.js 2>&1
ls app.json 2>&1
ls ios/ 2>&1
```

**Expected:** All grep commands return no matches. All `ls` commands return "No such file or directory" for deleted items.

### 14. iOS build smoke test (requires macOS + Xcode)

```bash
cd apps/mobile && npx expo run:ios
```

**Expected:** Metro starts, bundles the app, and the iOS build compiles. This confirms `metro.config.js` and `babel.config.js` are correct.

## Pass Criteria

All steps 1–13 must pass. Step 14 is a manual smoke test that requires macOS with Xcode installed.

## Dependencies

Must run after all previous specs (01–05) are complete.
