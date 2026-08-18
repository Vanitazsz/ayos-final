# 02 — Remove EAS CLI Traces

## Objective

Remove all references to EAS (Expo Application Services) CLI from the repository. EAS is an unused dependency removed from internal tools.

## Background

The codebase has no `eas.json`, no `eas-cli` dependency, and no EAS build profiles. However, several residual traces remain: a broken root `app.json` created during an EAS experiment, duplicate `ios`/`android` scripts in the root `package.json` that point at it, an EAS project ID placeholder in `.env.example`, and a documentation mention in `AI_GUARDRAILS.md`.

## Changes

### 1. Delete root `app.json`

**File:** `/app.json` (repo root)

**Contents being removed:**
```json
{
  "ios": {
    "bundleIdentifier": "com.anonymous.a-yos"
  }
}
```

**Why:** This file was created in commit `a5a83c5` ("enable expo tooling and prebuild at repo root") as an experiment. It is invalid Expo config (missing the required `"expo"` wrapper key). The resulting prebuild generated Xcode projects with the wrong bundle ID (`org.name.ayos`). The real config is `apps/mobile/app.json` with bundle ID `com.ayos.app.dev`.

### 2. Remove `ios` and `android` scripts from root `package.json`

**File:** `/package.json`

**Lines to remove (lines 36-37):**
```json
    "android": "expo run:android",
    "ios": "expo run:ios"
```

**Why:** These scripts run `expo run:ios`/`expo run:android` from the repo root, which picks up the broken root `app.json`. The working versions already exist in `apps/mobile/package.json`. The root-level duplicates are non-functional.

### 3. Remove `EXPO_PUBLIC_EAS_PROJECT_ID` from `.env.example`

**File:** `/.env.example`

**Line to remove (line 30):**
```
EXPO_PUBLIC_EAS_PROJECT_ID=
```

**Note:** Keep `EXPO_ACCESS_TOKEN=` (line 29) — it is used by `supabase/functions/queue-consumer/index.ts` for Expo Push notification authentication, not EAS.

### 4. Remove EAS mention from `AI_GUARDRAILS.md`

**File:** `/AI_GUARDRAILS.md`

**Line to remove (line 347):**
```
There is no separate root script named `integration`, no EAS production-build script, and no native release/archive script: **Not confirmed from the current repository**. `expo export --platform web` is the configured Expo production export.
```

**Why:** With EAS fully removed, this documentation note is no longer relevant context.

### 5. Delete root `/ios/` directory (on-disk only)

**Directory:** `/ios/` at repo root

**Action:** `rm -rf ios/` from repo root

**Why:** This directory is already gitignored (`.gitignore` line: `/ios/`). It contains the failed prebuild output from the broken root `app.json` experiment (Xcode project with `org.name.ayos` bundle ID, failed build per `.expo/xcodebuild-error.log`). It is dead weight sitting on disk.

## Verification

1. `grep -r "EAS\|eas-cli\|eas\.json\|EXPO_PUBLIC_EAS" . --include='*.json' --include='*.md' --include='*.yaml' --include='*.yml' --include='*.ts' --include='*.js' --include='*.env*'` returns no matches (except `EXPO_ACCESS_TOKEN` which is kept)
2. Root `app.json` no longer exists
3. Root `package.json` no longer has `ios` or `android` scripts
4. `pnpm --dir apps/mobile ios` still works (unaffected — uses `apps/mobile/app.json`)

## Dependencies

None. Can run in parallel with spec 01.
