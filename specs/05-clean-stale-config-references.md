# 05 — Clean Stale References in Active Configs

## Objective

Remove vestigial `.next/` references and a dead `nativewind-env.d.ts` reference left over from the extracted admin portal (Next.js) and a removed NativeWind setup.

## Background

The admin portal was a Next.js application. After extraction, several config files still contain `.next/` ignore/exclude entries that no longer match anything. Additionally, `apps/mobile/tsconfig.json` references `nativewind-env.d.ts` — a file that does not exist and whose package (NativeWind) is not installed.

## Changes

### 1. `.gitignore` — remove `.next/` entry

**File:** `/.gitignore`

**Line to remove:**
```
.next/
```

**Why:** No Next.js application exists in the repository. The admin portal (the only Next.js app) was extracted.

### 2. `turbo.json` — remove `.next/**` from build outputs

**File:** `/turbo.json`

**Current `build.outputs`:**
```json
"outputs": ["dist/**", ".next/**", "!.next/cache/**"]
```

**New `build.outputs`:**
```json
"outputs": ["dist/**"]
```

**Why:** `.next/**` was the output directory for the Next.js admin portal build. Only `dist/**` is relevant now (Expo web export, shared packages).

### 3. `vitest.config.ts` — remove `**/.next/**` from exclude

**File:** `/vitest.config.ts`

**Current exclude:**
```ts
exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.expo/**'],
```

**New exclude:**
```ts
exclude: ['**/node_modules/**', '**/dist/**', '**/.expo/**'],
```

**Why:** No `.next/` directories exist. The exclusion is harmless but misleading.

### 4. `eslint.config.mjs` — remove `**/.next/**` from ignores

**File:** `/eslint.config.mjs`

**Current ignores:**
```js
ignores: [
  '**/dist/**',
  '**/.next/**',
  '**/coverage/**',
  '**/node_modules/**',
  '**/generated/**',
],
```

**New ignores:**
```js
ignores: [
  '**/dist/**',
  '**/coverage/**',
  '**/node_modules/**',
  '**/generated/**',
],
```

**Why:** No `.next/` directories exist. The ignore is vestigial.

### 5. `apps/mobile/tsconfig.json` — remove `nativewind-env.d.ts` from includes

**File:** `apps/mobile/tsconfig.json`

**Current includes:**
```json
"include": [
  "**/*.ts",
  "**/*.tsx",
  ".expo/types/**/*.ts",
  "expo-env.d.ts",
  "nativewind-env.d.ts"
]
```

**New includes:**
```json
"include": [
  "**/*.ts",
  "**/*.tsx",
  ".expo/types/**/*.ts",
  "expo-env.d.ts"
]
```

**Why:** NativeWind is not installed as a dependency, no `tailwind.config.*` exists, no `className` props are used anywhere in the codebase, and the file `nativewind-env.d.ts` does not exist. TypeScript silently ignores missing include globs, so this causes no error — but it is misleading dead configuration.

## Verification

1. `pnpm lint` passes
2. `pnpm --dir apps/mobile typecheck` passes
3. `pnpm format:check` passes
4. `grep -r "\.next" turbo.json .gitignore vitest.config.ts eslint.config.mjs` returns no matches
5. `grep "nativewind" apps/mobile/tsconfig.json` returns no matches

## Dependencies

Should run after spec 04 (the `eslint.config.js` deletion in spec 04 removes the conflicting config, making the `.mjs` edits unambiguous).
