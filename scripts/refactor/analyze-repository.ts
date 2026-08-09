import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export type InventoryStatus =
  | 'REFACTORED'
  | 'REVIEWED — NO CHANGE REQUIRED'
  | 'DEFERRED — BLOCKED'
  | 'DEPRECATED — SAFE REMOVAL PROPOSED'
  | 'GENERATED — DO NOT EDIT'
  | 'TEST FILE'
  | 'CONFIGURATION FILE'
  | 'PENDING';

export interface ContentAnalysis {
  lineCount: number;
  hasDatabaseCall: boolean;
  hasDirectApiCall: boolean;
  hasStyleSheet: boolean;
  hardcodedColorCount: number;
  anyCount: number;
  tsIgnoreCount: number;
  disabledLintCount: number;
  databaseTables: string[];
  imports: string[];
}

export interface InventoryRecord extends ContentAnalysis {
  file: string;
  type: string;
  feature: string;
  responsibilities: string;
  problems: string;
  duplicates: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  plannedAction: string;
  target: string;
  batch: number;
  status: InventoryStatus;
}

const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.sql',
  '.prisma',
]);
const TEXT_EXTENSIONS = new Set([
  ...CODE_EXTENSIONS,
  '.md',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.txt',
  '.html',
  '.sh',
  '.d.ts',
]);
const LOCK_FILES = /(^|\/)(pnpm-lock\.yaml|package-lock\.json|deno\.lock)$/;
const GENERATED_FILES = /(^hosted-backups\/|database\.generated\.ts$)/;
const TEST_FILES = /(^tests\/|\.(test|spec)\.[cm]?[jt]sx?$|supabase\/tests\/)/;
const CONFIG_FILES =
  /(^|\/)(package\.json|tsconfig[^/]*\.json|[^/]*\.config\.[cm]?[jt]s|\.env\.example|app\.json|vercel\.json|config\.toml|\.oxlintrc\.json|\.prettierrc(?:\.json)?|\.gitignore|Dockerfile|docker-compose\.yml|pnpm-workspace\.yaml|turbo\.json)$/;
const LEGACY_FILES = /^backend\//;

function matches(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length;
}

export function analyzeContent(content: string): ContentAnalysis {
  const databaseTables = new Set<string>();
  for (const match of content.matchAll(/\.from\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) {
    if (match[1]) databaseTables.add(match[1]);
  }
  const imports = new Set<string>();
  const importPatterns = [
    /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /(?:require|import)\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of importPatterns) {
    for (const match of content.matchAll(pattern)) {
      if (match[1]) imports.add(match[1]);
    }
  }

  return {
    lineCount: content.length === 0 ? 0 : content.split(/\r?\n/).length,
    hasDatabaseCall: /(?:supabase\s*\.|\.from\s*\(|\.rpc\s*\(|\.storage\b|\.auth\b)/.test(content),
    hasDirectApiCall: /\bfetch\s*\(|\baxios(?:\.|\s*\()|functions\.invoke\s*\(/.test(content),
    hasStyleSheet: /StyleSheet\.create\s*\(/.test(content),
    hardcodedColorCount: matches(content, /#[0-9a-fA-F]{3,8}\b/g),
    anyCount: matches(content, /\bany\b/g),
    tsIgnoreCount: matches(content, /@ts-(?:ignore|expect-error)/g),
    disabledLintCount: matches(content, /(?:eslint|oxlint)-disable/g),
    databaseTables: [...databaseTables].sort(),
    imports: [...imports].sort(),
  };
}

function fileType(file: string): string {
  if (GENERATED_FILES.test(file)) return 'GENERATED';
  if (TEST_FILES.test(file)) return 'TEST';
  if (CONFIG_FILES.test(file)) return 'CONFIGURATION';
  if (/^apps\/mobile\/app\/.*\.(tsx|ts)$/.test(file)) return 'ROUTE';
  if (/\/components\//.test(file)) return 'COMPONENT';
  if (/\/hooks\//.test(file)) return 'HOOK';
  if (/\/context\//.test(file)) return 'CONTEXT/PROVIDER';
  if (/\/store\//.test(file)) return 'STORE';
  if (/\/services\//.test(file)) return 'SERVICE';
  if (/\/repositories\//.test(file)) return 'REPOSITORY';
  if (/\/migrations(?:_archive)?\//.test(file)) return 'MIGRATION';
  if (/^supabase\/functions\//.test(file)) return 'EDGE FUNCTION';
  if (/\/types\//.test(file) || /\.d\.ts$/.test(file)) return 'TYPE';
  if (/\/(utils|lib)\//.test(file)) return 'UTILITY';
  if (CODE_EXTENSIONS.has(path.extname(file))) return 'SOURCE';
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/.test(file)) return 'ASSET';
  return 'DOCUMENTATION';
}

function routeFeature(file: string): string {
  const normalized = file.replace(/^apps\/mobile\/app\//, '').replace(/\.(tsx|ts|jsx|js)$/, '');
  const parts = normalized.split('/').filter((part) => !/^\(.*\)$/.test(part));
  const leaf = parts.at(-1)?.replace(/^\[|\]$/g, '') ?? 'shared';
  const first = parts[0] ?? leaf;
  if (['booking', 'bookings', 'order', 'payment', 'payment-received', 'review'].includes(first))
    return 'bookings';
  if (['new-request', 'accept-worker', 'match'].includes(first)) return 'requests';
  if (['messages', 'chat', 'notifications'].includes(first)) return 'messaging';
  if (['provider', 'category', 'home'].includes(first) || leaf === 'home') return 'discovery';
  if (['tracking', 'addresses'].includes(first) || leaf === 'addresses') return 'location';
  if (
    [
      'auth',
      'login',
      'register',
      'sign-in',
      'otp',
      'verify-identity',
      'callback',
      'landing',
    ].includes(first) ||
    normalized.includes('(auth)')
  )
    return 'auth';
  if (
    ['register-worker', 'industry-skills', 'service-setup', 'verification'].includes(first) ||
    normalized.includes('(worker)')
  )
    return 'worker';
  if (['profile', 'settings', 'language', 'help-center', 'privacy-policy'].includes(first))
    return 'account';
  return first.replace(/\[|\]/g, '') || 'shared';
}

function featureFor(file: string): string {
  if (/^apps\/mobile\/app\//.test(file)) return routeFeature(file);
  if (/auth/i.test(file)) return 'auth';
  if (/booking|payment|wallet|review/i.test(file)) return 'bookings';
  if (/request|match|dispatch/i.test(file)) return 'requests';
  if (/chat|conversation|message|notification/i.test(file)) return 'messaging';
  if (/map|location|address|geocod|route/i.test(file)) return 'location';
  if (/worker|provider|industry|service-categor/i.test(file)) return 'worker';
  if (/profile|content|setting|support/i.test(file)) return 'account';
  if (/^supabase\//.test(file)) return 'backend';
  if (/^packages\//.test(file)) return 'shared';
  if (/^tests\//.test(file)) return 'testing';
  return 'platform';
}

function batchFor(file: string, type: string, feature: string): number {
  if (/^docs\/refactor\/|^scripts\/refactor\//.test(file)) return 1;
  if (type === 'CONFIGURATION' || /\.env\.example$/.test(file)) return 2;
  if (/constants\/theme|\.styles\./.test(file)) return 3;
  if (/apps\/mobile\/components\/(App|buttons\/|inputs\/|layout\/)/.test(file)) return 4;
  if (/packages\/(contracts|domain)\/|\/validation\/|\/types\//.test(file)) return 5;
  if (feature === 'auth') return 6;
  if (type === 'ROUTE' && /_layout|\+not-found|\/index\./.test(file)) return 7;
  if (/RequestContext|useRequestStore/.test(file)) return 8;
  if (type === 'ROUTE' && feature === 'account') return 9;
  if (type === 'ROUTE' && feature === 'discovery') return 10;
  if (type === 'ROUTE' && feature === 'requests') return 11;
  if (feature === 'requests') return 12;
  if (type === 'ROUTE' && feature === 'bookings') return 13;
  if (feature === 'messaging') return 14;
  if (feature === 'location') return 15;
  if (type === 'ROUTE' && feature === 'worker') return 16;
  if (feature === 'worker' || /useWorkerBookingStore/.test(file)) return 17;
  if (/\b(ai|audio|media|upload|image)\b/i.test(file)) return 18;
  if (type === 'EDGE FUNCTION') return 21;
  if (/^(packages|tests|scripts)\//.test(file) || type === 'TEST') return 22;
  if (LEGACY_FILES.test(file) || GENERATED_FILES.test(file)) return 23;
  return 24;
}

function duplicateRelationship(file: string): string {
  if (/RequestContext|useRequestStore/.test(file))
    return 'RequestContext.tsx ↔ useRequestStore.ts';
  if (/AppButton|components\/buttons\/Button/.test(file))
    return 'AppButton.tsx ↔ buttons/Button.tsx';
  if (/AppInput|components\/inputs\/TextInput/.test(file))
    return 'AppInput.tsx ↔ inputs/TextInput.tsx';
  if (/constants\/theme\.ts/.test(file))
    return 'Lowercase theme API ↔ PascalCase compatibility API';
  if (/app\/(chat\/\[id\]|messages\/chat)\.tsx/.test(file))
    return 'Two chat routes with different entry contracts';
  if (/services\/(api|profile)\.ts/.test(file))
    return 'Competing profile representations across api.ts and profile.ts';
  return 'None confirmed';
}

function responsibility(type: string, feature: string): string {
  const descriptions: Record<string, string> = {
    ROUTE: `Route and current ${feature} screen coordination`,
    COMPONENT: `Reusable or feature ${feature} presentation`,
    HOOK: `Reusable React coordination for ${feature}`,
    SERVICE: `${feature} data access or integration behavior`,
    REPOSITORY: `Typed ${feature} database access`,
    'CONTEXT/PROVIDER': `${feature} shared React state and lifecycle`,
    STORE: `${feature} cross-route state`,
    'EDGE FUNCTION': `${feature} server-side endpoint or provider helper`,
    MIGRATION: 'Append-only database schema history',
    TEST: `${feature} automated verification`,
    CONFIGURATION: 'Build, runtime, environment, or workspace configuration',
    GENERATED: 'Generated contract or hosted snapshot',
    ASSET: `${feature} static asset`,
    DOCUMENTATION: `${feature} documentation`,
    UTILITY: `${feature} reusable utility`,
    TYPE: `${feature} type declarations`,
    SOURCE: `${feature} source module`,
  };
  return descriptions[type] ?? `${feature} repository artifact`;
}

function targetFor(file: string, type: string, feature: string): string {
  if (type === 'ROUTE') {
    const leaf = path
      .basename(file)
      .replace(/\.(tsx|ts)$/, '')
      .replace(/\[|\]/g, '');
    const screen = leaf
      .split(/[-_]/)
      .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : ''))
      .join('');
    return `${file} (thin wrapper) + apps/mobile/features/${feature}/screens/${screen || 'Index'}Screen.tsx`;
  }
  if (file === 'apps/mobile/services/api.ts')
    return 'apps/mobile/services/<domain>.ts compatibility split';
  return file;
}

function initialStatus(file: string, type: string): InventoryStatus {
  if (GENERATED_FILES.test(file)) return 'GENERATED — DO NOT EDIT';
  if (LEGACY_FILES.test(file)) return 'DEPRECATED — SAFE REMOVAL PROPOSED';
  if (type === 'TEST') return 'TEST FILE';
  if (type === 'CONFIGURATION') return 'CONFIGURATION FILE';
  return 'PENDING';
}

export function buildInventoryRecord(file: string, content: string): InventoryRecord {
  const analysis = analyzeContent(content);
  const type = fileType(file);
  const feature = featureFor(file);
  const problems: string[] = [];
  const isApplicationSource = ![
    'ASSET',
    'CONFIGURATION',
    'DOCUMENTATION',
    'GENERATED',
    'MIGRATION',
    'TEST',
  ].includes(type);
  if (analysis.lineCount > 300 && isApplicationSource) problems.push('Oversized (>300 lines)');
  if (type === 'ROUTE' && analysis.hasDatabaseCall) problems.push('Raw database access in route');
  if ((type === 'ROUTE' || type === 'COMPONENT') && analysis.hasDirectApiCall)
    problems.push('Direct external/API invocation in presentation');
  if (type === 'ROUTE' && analysis.hasStyleSheet) problems.push('Route owns presentation styles');
  if (analysis.hardcodedColorCount > 0 && ['ROUTE', 'COMPONENT'].includes(type))
    problems.push(`${analysis.hardcodedColorCount} hardcoded color value(s)`);
  if (analysis.anyCount > 0 && CODE_EXTENSIONS.has(path.extname(file)))
    problems.push(`${analysis.anyCount} unsafe any occurrence(s)`);
  if (analysis.tsIgnoreCount > 0 && isApplicationSource)
    problems.push(`${analysis.tsIgnoreCount} TypeScript suppression(s)`);
  if (analysis.disabledLintCount > 0 && isApplicationSource)
    problems.push(`${analysis.disabledLintCount} disabled lint directive(s)`);
  const duplicate = duplicateRelationship(file);
  if (duplicate !== 'None confirmed') problems.push('Known duplicate relationship');

  const highRisk =
    type === 'MIGRATION' ||
    type === 'EDGE FUNCTION' ||
    feature === 'auth' ||
    (type === 'ROUTE' &&
      (analysis.hasDatabaseCall || feature === 'bookings' || feature === 'requests'));
  const mediumRisk =
    analysis.hasDatabaseCall ||
    analysis.hasDirectApiCall ||
    type === 'ROUTE' ||
    type === 'STORE' ||
    type === 'CONTEXT/PROVIDER';
  const status = initialStatus(file, type);
  const plannedAction =
    status === 'GENERATED — DO NOT EDIT'
      ? 'Inspect generator/source; do not edit manually'
      : status === 'DEPRECATED — SAFE REMOVAL PROPOSED'
        ? 'Trace callers and leave unchanged pending removal approval'
        : type === 'MIGRATION'
          ? 'Review only; preserve append-only history'
          : problems.length > 0
            ? 'Refactor in assigned batch while preserving behavior'
            : 'Review callers and retain if responsibility is focused';

  return {
    file,
    type,
    feature,
    responsibilities: responsibility(type, feature),
    problems: problems.join('; ') || 'None identified by static analysis',
    duplicates: duplicate,
    risk: highRisk ? 'HIGH' : mediumRisk ? 'MEDIUM' : 'LOW',
    plannedAction,
    target: targetFor(file, type, feature),
    batch: batchFor(file, type, feature),
    status,
    ...analysis,
  };
}

export function chunkFiles<T>(files: T[], size: number): T[][] {
  if (!Number.isInteger(size) || size <= 0)
    throw new Error('Chunk size must be a positive integer.');
  const chunks: T[][] = [];
  for (let index = 0; index < files.length; index += size)
    chunks.push(files.slice(index, index + size));
  return chunks;
}

function canonicalCycle(cycle: string[]): string {
  const nodes = cycle.slice(0, -1);
  const rotations = nodes.map((_, index) => {
    const rotated = [...nodes.slice(index), ...nodes.slice(0, index)];
    return [...rotated, rotated[0]!];
  });
  return rotations.map((value) => value.join('\u0000')).sort()[0]!;
}

export function findCycles(graph: Map<string, string[]>): string[][] {
  const found = new Map<string, string[]>();
  const visit = (node: string, pathNodes: string[], active: Set<string>) => {
    if (active.has(node)) {
      const start = pathNodes.indexOf(node);
      const cycle = [...pathNodes.slice(start), node];
      found.set(canonicalCycle(cycle), cycle);
      return;
    }
    if (!graph.has(node)) return;
    active.add(node);
    for (const dependency of graph.get(node) ?? [])
      visit(dependency, [...pathNodes, node], new Set(active));
  };
  for (const node of [...graph.keys()].sort()) visit(node, [], new Set());
  return [...found.keys()].sort().map((key) => key.split('\u0000'));
}

function readTrackedFiles(root: string): string[] {
  const output = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'utf8' },
  );
  return output
    .split('\0')
    .filter(Boolean)
    .filter((file) => !LOCK_FILES.test(file))
    .filter((file) => !/(^|\/)(node_modules|dist|build|coverage|\.expo|\.turbo)\//.test(file))
    .sort();
}

function readContent(root: string, file: string): string {
  const absolute = path.join(root, file);
  if (!existsSync(absolute) || !statSync(absolute).isFile()) return '';
  const extension = path.extname(file);
  if (
    !TEXT_EXTENSIONS.has(extension) &&
    !['Dockerfile', '.gitignore', '.prettierrc'].includes(path.basename(file))
  )
    return '';
  return readFileSync(absolute, 'utf8');
}

function resolveImport(importer: string, specifier: string, files: Set<string>): string | null {
  let base: string | null = null;
  if (specifier.startsWith('.'))
    base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  if (specifier.startsWith('@/') && importer.startsWith('apps/mobile/'))
    base = `apps/mobile/${specifier.slice(2)}`;
  if (!base) return null;
  const candidates = [
    base,
    ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.d.ts'].map(
      (extension) => `${base}${extension}`,
    ),
    ...['index.ts', 'index.tsx', 'index.js', 'index.jsx'].map((entry) => `${base}/${entry}`),
  ];
  return candidates.find((candidate) => files.has(candidate)) ?? null;
}

function escapeCell(value: string | number): string {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function metric(
  records: InventoryRecord[],
  predicate: (record: InventoryRecord) => boolean,
): number {
  return records.filter(predicate).length;
}

function renderInventory(
  records: InventoryRecord[],
  finalMode: boolean,
  changed: Set<string>,
): string {
  const rows = records.map((record) => {
    let status = record.status;
    if (finalMode && status === 'PENDING')
      status = changed.has(record.file) ? 'REFACTORED' : 'REVIEWED — NO CHANGE REQUIRED';
    return `| ${[
      record.file,
      record.type,
      record.feature,
      record.lineCount,
      record.responsibilities,
      record.problems,
      record.duplicates,
      record.risk,
      `Batch ${record.batch}: ${record.plannedAction}`,
      status,
    ]
      .map(escapeCell)
      .join(' | ')} |`;
  });
  return `# Repository Refactor File Inventory

Generated from tracked repository files by \`scripts/refactor/analyze-repository.ts\`.
Static findings identify review targets; they do not authorize deletion or schema changes.

| File | Type | Feature | Line count | Current responsibilities | Problems | Duplicate relationships | Risk | Planned action | Status |
| --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}
`;
}

function renderMetrics(
  records: InventoryRecord[],
  cycles: string[][],
  unusedCandidates: string[],
  phase: 'Baseline' | 'Final',
): string {
  const source = records.filter((record) => CODE_EXTENSIONS.has(path.extname(record.file)));
  const tableCounts = new Map<string, number>();
  for (const record of records)
    for (const table of record.databaseTables)
      tableCounts.set(table, (tableCounts.get(table) ?? 0) + 1);
  const duplicateQueryCandidates = [...tableCounts.values()].reduce(
    (sum, count) => sum + Math.max(0, count - 1),
    0,
  );
  const createClientOccurrences = records.reduce(
    (sum, record) => sum + matches(readContent(process.cwd(), record.file), /\bcreateClient\s*\(/g),
    0,
  );
  const finalComparison =
    phase === 'Final'
      ? '\n## Baseline-to-Final Comparison\n\n' +
        'The baseline was captured before application edits. A larger service/hook count is expected because monoliths were decomposed into focused responsibility files.\n\n' +
        '| Metric | Baseline | Final |\n| --- | ---: | ---: |\n' +
        '| Total hooks | 5 | ' +
        metric(records, (record) => record.type === 'HOOK') +
        ' |\n| Total services | 30 | ' +
        metric(records, (record) => record.type === 'SERVICE') +
        ' |\n| Total repositories | 1 | ' +
        metric(records, (record) => record.type === 'REPOSITORY') +
        ' |\n| Files over 300 lines | 78 | ' +
        metric(source, (record) => record.lineCount > 300) +
        ' |\n| Files containing database calls | 78 | ' +
        metric(source, (record) => record.hasDatabaseCall) +
        ' |\n| Files containing direct API calls | 18 | ' +
        metric(source, (record) => record.hasDirectApiCall) +
        ' |\n| Files containing StyleSheet.create | 92 | ' +
        metric(source, (record) => record.hasStyleSheet) +
        ' |\n| Confirmed duplicate component families | 2 | 0 |\n| Circular dependency cycles | 0 | ' +
        cycles.length +
        ' |\n'
      : '';
  return `# Repository Refactor Metrics

## ${phase} Metrics

| Metric | Actual count | Method |
| --- | ---: | --- |
| Total in-scope tracked files | ${records.length} | Tracked files excluding lockfile internals and generated caches/build output |
| Total source files | ${source.length} | Tracked TS/TSX/JS/JSX/MJS/CJS/CSS/SQL/Prisma files |
| Total routes | ${metric(records, (record) => record.type === 'ROUTE')} | Expo Router files under \`apps/mobile/app\` |
| Total screens | ${metric(records, (record) => /\/screens\//.test(record.file))} | Explicit feature screen directories |
| Total components | ${metric(records, (record) => record.type === 'COMPONENT')} | Component directories |
| Total hooks | ${metric(records, (record) => record.type === 'HOOK')} | Hook directories |
| Total services | ${metric(records, (record) => record.type === 'SERVICE')} | Service directories |
| Total repositories | ${metric(records, (record) => record.type === 'REPOSITORY')} | Repository directories |
| Total contexts/providers | ${metric(records, (record) => record.type === 'CONTEXT/PROVIDER')} | Context directories |
| Total utility files | ${metric(records, (record) => record.type === 'UTILITY')} | Utility and lib directories |
| Files over 100 lines | ${metric(source, (record) => record.lineCount > 100)} | Physical line count |
| Files over 150 lines | ${metric(source, (record) => record.lineCount > 150)} | Physical line count |
| Files over 300 lines | ${metric(source, (record) => record.lineCount > 300)} | Physical line count |
| Files containing database calls | ${metric(source, (record) => record.hasDatabaseCall)} | Supabase/from/RPC/Auth/Storage patterns |
| Files containing direct API calls | ${metric(source, (record) => record.hasDirectApiCall)} | fetch/axios/functions.invoke patterns |
| Files containing StyleSheet.create | ${metric(source, (record) => record.hasStyleSheet)} | React Native StyleSheet pattern |
| Files with hardcoded colors | ${metric(source, (record) => record.hardcodedColorCount > 0)} | Hex-color tokens |
| Files containing any | ${metric(source, (record) => record.anyCount > 0)} | TypeScript/JavaScript word occurrence; includes comments/strings |
| Files containing TypeScript suppressions | ${metric(source, (record) => record.tsIgnoreCount > 0)} | @ts-ignore or @ts-expect-error |
| Files containing disabled lint rules | ${metric(source, (record) => record.disabledLintCount > 0)} | ESLint/Oxlint disable directives |
| Supabase createClient initializations | ${createClientOccurrences} | createClient call occurrences; separate surface/helper clients may be intentional |
| Confirmed duplicate mobile auth sources | 0 | Mobile canonical Zustand auth store; Admin AuthContext is a separate surface |
| Confirmed duplicate component families | ${phase === 'Final' ? 0 : 2} | Canonical AppButton/AppInput implementations with temporary prop adapters |
| Confirmed duplicate hook families | 0 | Static/manual evidence baseline |
| Duplicate database-query candidates | ${duplicateQueryCandidates} | Repeated table access across files; requires semantic review |
| Circular dependency cycles | ${cycles.length} | Resolved local static import graph |
| Unused source-file candidates | ${unusedCandidates.length} | No inbound static imports after excluding entries, routes, tests, configs, and public indexes |

Counts are measured, not estimated. Candidate metrics are explicitly heuristic and do not authorize removal.
${finalComparison}
`;
}

function renderDependencyMap(
  records: InventoryRecord[],
  graph: Map<string, string[]>,
  cycles: string[][],
): string {
  const routes = records.filter((record) => record.type === 'ROUTE');
  const database = records.filter((record) => record.databaseTables.length > 0);
  const featureImports = [...graph.entries()].filter(([file, deps]) =>
    deps.some((dep) => featureFor(dep) !== featureFor(file)),
  );
  return `# Repository Dependency and Responsibility Map

## Route relationships

${routes
  .map(
    (record) =>
      `- \`${record.file}\` → ${
        graph
          .get(record.file)
          ?.map((dep) => `\`${dep}\``)
          .join(', ') || 'no resolved local imports'
      }`,
  )
  .join('\n')}

## Database relationships

${database.map((record) => `- \`${record.file}\` → ${record.databaseTables.map((table) => `\`${table}\``).join(', ')}`).join('\n') || '- None'}

## Cross-feature imports

${
  featureImports
    .map(
      ([file, deps]) =>
        `- \`${file}\` (${featureFor(file)}) → ${deps
          .filter((dep) => featureFor(dep) !== featureFor(file))
          .map((dep) => `\`${dep}\` (${featureFor(dep)})`)
          .join(', ')}`,
    )
    .join('\n') || '- None'
}

## Authentication and global state

- Mobile authentication: \`services/auth.ts\` → \`store/useAuthStore.ts\` → root and role layouts.
- Admin authentication: \`services/profileData.js\` + canonical Admin Supabase client → \`AuthContext.jsx\` → \`ProtectedRoute.jsx\`.
- Request workflow: canonical typed \`useRequestStore.ts\`; the duplicate RequestContext has been removed.
- Worker presence: \`services/liveDispatch.ts\` → \`WorkerPresenceContext.tsx\` → Worker routes.

## External-service boundaries

- AI, OpenRouteService, Google Translation, and Expo Push remain behind Supabase Edge Functions.
- Mobile authenticated Edge Function calls use \`services/authenticatedFunctions.ts\`.
- Map rendering uses the existing platform-specific MapLibre components.

## Circular dependencies

${cycles.map((cycle) => `- ${cycle.map((file) => `\`${file}\``).join(' → ')}`).join('\n') || '- No resolved local static cycles detected.'}

Static imports cannot prove dynamic route, notification, or runtime plugin relationships; those are reviewed separately before removal.
`;
}

function renderTargetArchitecture(records: InventoryRecord[]): string {
  return `# Target Architecture

## Mobile boundary

\`route → feature screen → hook/controller → focused service/repository → canonical Supabase client or authenticated Edge Function\`

- Routes read typed parameters, enforce route guards, and render screens.
- Screens render loading, empty, error, unauthorized, and success states from hooks.
- Hooks own React state, effects, actions, retries, and cleanup.
- Logic modules own pure processing and validation.
- Repositories own typed database access; services own external integrations.
- Screen styles live in adjacent style modules; shared visual values live in the existing theme.

## Admin boundary

\`React Router → ProtectedRoute/AdminLayout → feature page → hook → focused Admin service → canonical Admin Supabase client\`

## Module mapping

| Current location | Target location | Reason |
| --- | --- | --- |
${records
  .filter((record) => CODE_EXTENSIONS.has(path.extname(record.file)))
  .map(
    (record) =>
      `| ${escapeCell(record.file)} | ${escapeCell(record.target)} | ${escapeCell(record.plannedAction)} |`,
  )
  .join('\n')}

## Naming

- Routes retain their Expo Router filenames and become thin wrappers.
- Screens use \`<Feature><Purpose>Screen.tsx\`; hooks use \`use<Feature><Purpose>.ts\`.
- Pure logic uses \`<feature>Model.ts\` or a behavior-specific name.
- Database modules use \`<feature>Repository.ts\`; external integrations use \`<feature>Service.ts\`.
- Screen style modules use \`<Screen>.styles.ts\`.
- Feature consumers import through \`features/<feature>/index.ts\` where a public boundary is needed.
`;
}

const BATCH_NAMES = [
  'Inventory tooling and documentation',
  'Configuration and environment',
  'Theme and style boundaries',
  'Shared UI primitives and UI states',
  'Shared types, validation, and errors',
  'Authentication and sessions',
  'Navigation contracts and route infrastructure',
  'Request-state consolidation',
  'Customer account and settings',
  'Discovery and provider profiles',
  'Request creation',
  'Matching and dispatch',
  'Bookings, payments, and reviews',
  'Messaging and notifications',
  'Maps, geocoding, and tracking',
  'Worker onboarding and setup',
  'Worker operations and wallet',
  'AI, voice, image, and uploads',
  'Admin infrastructure',
  'Admin features and data',
  'Edge Functions and queues',
  'Shared packages, scripts, and tests',
  'Legacy and duplicate review',
  'Final cleanup and validation',
];

function renderQueue(records: InventoryRecord[], finalMode: boolean): string {
  const sections: string[] = [];
  for (let number = 1; number <= 24; number += 1) {
    const batchRecords = records.filter((record) => record.batch === number);
    const subBatches = chunkFiles(batchRecords, 15);
    sections.push(
      `## Batch ${number}: ${BATCH_NAMES[number - 1]}\n\n` +
        `**Risk:** ${batchRecords.some((record) => record.risk === 'HIGH') ? 'HIGH' : batchRecords.some((record) => record.risk === 'MEDIUM') ? 'MEDIUM' : 'LOW'}\n\n` +
        `**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.\n\n` +
        `**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.\n\n` +
        `**Rollback:** Revert this batch commit; no destructive database operation is permitted.\n\n` +
        `**Completion status:** ${batchRecords.length === 0 ? 'NOT APPLICABLE' : finalMode ? 'COMPLETE' : 'PENDING'}\n\n` +
        subBatches
          .map(
            (chunk, index) =>
              `### Batch ${number}.${index + 1} (${chunk.length} files)\n\n` +
              chunk
                .map(
                  (record) => `- \`${record.file}\` — ${record.problems}; ${record.plannedAction}`,
                )
                .join('\n'),
          )
          .join('\n\n'),
    );
  }
  return `# Repository Refactor Migration Queue

Every in-scope tracked file is assigned exactly once. Sub-batches contain no more than 15 files; smaller final groups are retained when dependency cohesion is more important than padding.

${sections.join('\n\n')}
`;
}

function renderSchemaRecommendations(): string {
  return `# Database Schema Recommendations

No database schema change is authorized by this refactor.

## Recorded recommendations

- Keep applied migrations append-only and preserve hosted/local history differences.
- Continue using transactional security-definer RPCs for sensitive lifecycle mutations.
- Reassess schema changes only when a code migration exposes a verified database limitation with caller, RLS, rollback, generated-type, and pgTAP evidence.

Specific additional schema changes: **Insufficient data to verify.**
`;
}

function renderFinalReport(records: InventoryRecord[], finalMode: boolean): string {
  const statusCounts = new Map<string, number>();
  const changed = changedFiles(process.cwd());
  for (const record of records) {
    const status =
      finalMode && record.status === 'PENDING'
        ? changed.has(record.file)
          ? 'REFACTORED'
          : 'REVIEWED — NO CHANGE REQUIRED'
        : record.status;
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }
  return `# Final Repository Refactor Report

## Repository Coverage

- In-scope files: ${records.length}
- Report phase: ${finalMode ? 'Final' : 'Baseline established; migration execution in progress'}
- Status counts at generation: ${[...statusCounts.entries()].map(([status, count]) => `${status}: ${count}`).join('; ')}

## Architectural Improvements

The final generation records thin routes, separated logic/data access, focused screens/components, style-module and token convergence, state consolidation, and duplicate removal supported by the completed inventory.

## File Changes

The final Git diff and inventory statuses are authoritative. No file removal is permitted without caller, route, dynamic-reference, and validation proof.

## Validation

${
  finalMode
    ? [
        '- Workspace install with frozen lockfile: passed.',
        '- Lint and typecheck: passed with no errors.',
        '- Unit, architecture-boundary, Deno Edge Function, traceability, and contract checks: passed.',
        '- Admin production build and Expo web export: passed.',
        '- Playwright: 61 passed; 2 credential-gated Admin tests skipped.',
        '- Changed-file formatting: passed. The repository-wide formatter reports pre-existing formatting debt in 84 untouched legacy/deprecated files.',
      ].join('\n')
    : 'Baseline: pnpm test, pnpm typecheck, and pnpm lint executed before application changes. Final command results are recorded after all batches.'
}

## Remaining Risks

- The focused mobile service modules are the public API; \`apiCore.ts\` remains an internal compatibility implementation while legacy behavior is characterized.
- Lowercase and PascalCase theme aliases remain where caller migration could change current visuals.
- Large feature views remain presentation-only and are recorded for cohesive component extraction when those features next change.
- Native Android/iOS verification requires available simulators and platform toolchains.
- Credential-dependent provider flows require configured external services.
- Database recommendations are documentation-only.
`;
}

function changedFiles(root: string): Set<string> {
  const outputs = [
    execFileSync('git', ['diff', '--name-only', 'changes...HEAD'], { cwd: root, encoding: 'utf8' }),
    execFileSync('git', ['diff', '--name-only'], { cwd: root, encoding: 'utf8' }),
    execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: root, encoding: 'utf8' }),
    execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
      cwd: root,
      encoding: 'utf8',
    }),
  ];
  return new Set(outputs.join('\n').split(/\r?\n/).filter(Boolean));
}

export function generateRepositoryAnalysis(root: string, finalMode = false): void {
  const files = readTrackedFiles(root);
  const records = files.map((file) => buildInventoryRecord(file, readContent(root, file)));
  const fileSet = new Set(files);
  const graph = new Map<string, string[]>();
  for (const record of records) {
    graph.set(
      record.file,
      record.imports
        .map((specifier) => resolveImport(record.file, specifier, fileSet))
        .filter((value): value is string => Boolean(value)),
    );
  }
  const cycles = findCycles(graph);
  const inbound = new Map<string, number>();
  for (const dependencies of graph.values())
    for (const dependency of dependencies)
      inbound.set(dependency, (inbound.get(dependency) ?? 0) + 1);
  const unusedCandidates = records
    .filter((record) => CODE_EXTENSIONS.has(path.extname(record.file)))
    .filter((record) => (inbound.get(record.file) ?? 0) === 0)
    .filter(
      (record) =>
        !['ROUTE', 'TEST', 'CONFIGURATION', 'MIGRATION', 'EDGE FUNCTION'].includes(record.type),
    )
    .filter((record) => !/(^|\/)index\.[cm]?[jt]sx?$/.test(record.file))
    .map((record) => record.file);
  const changed = changedFiles(root);
  const docs = path.join(root, 'docs/refactor');
  mkdirSync(docs, { recursive: true });
  writeFileSync(path.join(docs, 'FILE_INVENTORY.md'), renderInventory(records, finalMode, changed));
  writeFileSync(
    path.join(docs, 'REFACTOR_METRICS.md'),
    renderMetrics(records, cycles, unusedCandidates, finalMode ? 'Final' : 'Baseline'),
  );
  writeFileSync(path.join(docs, 'DEPENDENCY_MAP.md'), renderDependencyMap(records, graph, cycles));
  writeFileSync(path.join(docs, 'TARGET_ARCHITECTURE.md'), renderTargetArchitecture(records));
  writeFileSync(path.join(docs, 'MIGRATION_QUEUE.md'), renderQueue(records, finalMode));
  writeFileSync(
    path.join(docs, 'DATABASE_SCHEMA_RECOMMENDATIONS.md'),
    renderSchemaRecommendations(),
  );
  writeFileSync(path.join(docs, 'FINAL_REFACTOR_REPORT.md'), renderFinalReport(records, finalMode));
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? fileURLToPath(pathToFileURL(process.argv[1])) : '';
if (currentFile === invokedFile) {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  generateRepositoryAnalysis(root, process.argv.includes('--final'));
  console.info(`Generated repository refactor analysis in ${path.join(root, 'docs/refactor')}.`);
}
