# 04 — Delete Orphaned and Redundant Files

## Objective

Remove files that are no longer referenced or needed: a stale npm lockfile, an unreferenced backup directory, and a duplicate ESLint config.

## Background

Three orphaned items remain from prior project phases:

1. A root `package-lock.json` (npm lockfile) while the project exclusively uses pnpm
2. A `hosted-backups/` directory containing a manual Supabase database backup artifact
3. A duplicate `eslint.config.js` at root alongside the intended `eslint.config.mjs`

## Changes

### 1. Delete root `package-lock.json`

```
rm package-lock.json
```

**Why:** The project uses pnpm (`packageManager: pnpm@11.9.0` in root `package.json`, `pnpm-lock.yaml` present). This npm lockfile is 255KB of dead weight. Having both lockfiles can cause confusion about which package manager is authoritative.

### 2. Delete `hosted-backups/` directory

```
rm -rf hosted-backups/
```

**Contents being removed:**
```
hosted-backups/qsurouiyvisykjkgjqmz/2026-07-22-auth-cutover/
```

**Why:** This is a manual Supabase project backup artifact. It is not referenced by any script, CI workflow, or configuration. If backups are needed, they should be managed through Supabase's dashboard or a dedicated backup process, not sitting in the repo.

### 3. Delete root `eslint.config.js`

```
rm eslint.config.js
```

**Contents being removed:**
```js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', 'backend/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { 'no-undef': 'off' } },
);
```

**Why:** This is a duplicate ESLint flat config that conflicts with `eslint.config.mjs`. ESLint flat config resolves to one file — having both causes ambiguity. The `.mjs` version is the intended active config: it uses `recommendedTypeChecked` rules, has `projectService` integration, and enforces `consistent-type-imports` and `no-floating-promises`. The `.js` version is a simpler, older config that ignores `backend/**` (which is being deleted in spec 03 anyway).

## Verification

1. `ls package-lock.json` returns "No such file or directory"
2. `ls hosted-backups/` returns "No such file or directory"
3. `ls eslint.config.js` returns "No such file or directory"; `ls eslint.config.mjs` still exists
4. `pnpm lint` still succeeds (resolves to `eslint.config.mjs`)
5. No other tool references the deleted files

## Dependencies

Should run after spec 03 (backend deletion removes the `backend/**` ignore context from the deleted `eslint.config.js`).
