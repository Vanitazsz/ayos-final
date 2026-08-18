# 01 — Create iOS Build Configs

## Objective

Create the two missing config files required for `expo run:ios` to work in this Expo SDK 54 + pnpm monorepo.

## Background

Neither `metro.config.js` nor `babel.config.js` exists in `apps/mobile/`. These are required for Metro bundler resolution and Babel transpilation when running `expo run:ios` or `expo start`. They were never committed to the repository.

## Changes

### 1. Create `apps/mobile/metro.config.js`

```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
```

**Rationale:** The pnpm workspace uses `nodeLinker: hoisted`, so `node_modules` is flat. However, `expo`, `react`, and `react-native` are declared as root-level dependencies in the root `package.json`. Metro needs to watch the workspace root and include both `node_modules` paths so it can resolve these shared dependencies correctly.

### 2. Create `apps/mobile/babel.config.js`

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

**Rationale:** Standard Expo Babel config. `react-native-reanimated/plugin` must be the last plugin per the reanimated docs. `@babel/core` is already in `devDependencies`.

## Verification

1. From `apps/mobile/`, run `npx expo start` and confirm Metro starts without resolution errors
2. From `apps/mobile/`, run `npx expo run:ios` and confirm the iOS build compiles
3. Run `pnpm --dir apps/mobile typecheck` to ensure no type errors introduced

## Dependencies

None. This is the first spec to run.
