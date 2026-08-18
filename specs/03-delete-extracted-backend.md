# 03 — Delete Extracted Backend

## Objective

Remove the entire `backend/` directory — a standalone NestJS+Prisma application that was extracted to a separate repository but never deleted from this one.

## Background

The `backend/` directory contains a complete Express.js REST API with Prisma ORM, its own `package.json`, `pnpm-lock.yaml`, `package-lock.json`, `Dockerfile`, `docker-compose.yml`, and `node_modules/`. It is:

- **Not in the pnpm workspace** — `pnpm-workspace.yaml` only includes `apps/*`, `packages/*`, `tests/*`
- **Not in the Turborepo pipeline** — `turbo.json` does not reference it
- **Not referenced by any root script** — no script in the root `package.json` touches `backend/`
- **Not referenced by CI** — `.github/workflows/ci.yml` does not mention it
- **Lint-excluded** — `eslint.config.js` explicitly ignores `backend/**`

The admin portal was moved to a separate repository (commit `655c895`). The backend appears to have been similarly extracted but the directory was never cleaned up.

## Changes

### 1. Delete the entire `backend/` directory

```
rm -rf backend/
```

This removes:
- `backend/package.json` (ayos-backend)
- `backend/pnpm-lock.yaml` (148 KB)
- `backend/package-lock.json` (255 KB)
- `backend/node_modules/` (36 top-level entries)
- `backend/src/` (full Express application)
- `backend/prisma/` (schema + migrations)
- `backend/Dockerfile`, `backend/docker-compose.yml`
- `backend/tests/`
- All other files in the directory

### 2. Delete `infra/` directory

```
rm -rf infra/
```

**Contents being removed:**
```
infra/admin-nginx.conf
```

**Why:** This is an nginx config for serving the extracted admin portal's static SPA. The admin portal no longer exists in this repository.

## Verification

1. `ls backend/` returns "No such file or directory"
2. `ls infra/` returns "No such file or directory"
3. `pnpm install` still succeeds (backend was not in workspace)
4. `pnpm lint` still succeeds (backend was already excluded)
5. `pnpm typecheck` still succeeds
6. Disk space reclaimed: `backend/node_modules/` and `backend/pnpm-lock.yaml` were significant

## Dependencies

None. Can run in parallel with specs 01 and 02.
