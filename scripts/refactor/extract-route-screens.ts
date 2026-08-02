import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildInventoryRecord } from './analyze-repository.js';

function pascalSegment(segment: string): string {
  return segment
    .replace(/^\((.*)\)$/, '$1')
    .replace(/^\[(.*)\]$/, '$1')
    .replace(/^\+/, '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('');
}

export function routeScreenTarget(
  routeFile: string,
  feature: string,
): { importPath: string; targetFile: string } {
  const relative = routeFile.replace(/^apps\/mobile\/app\//, '').replace(/\.(tsx|ts)$/, '');
  const name = relative.split('/').map(pascalSegment).join('') || 'Root';
  const targetFile = `apps/mobile/features/${feature}/screens/${name}Screen.tsx`;
  return {
    importPath: `@/features/${feature}/screens/${name}Screen`,
    targetFile,
  };
}

export function extractViolatingRoutes(root: string): string[] {
  const routeFiles = execFileSync(
    'git',
    [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      'apps/mobile/app/*.tsx',
      'apps/mobile/app/**/*.tsx',
    ],
    { cwd: root, encoding: 'utf8' },
  )
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => existsSync(path.join(root, file)));

  const extracted: string[] = [];
  for (const routeFile of routeFiles) {
    const absoluteRoute = path.join(root, routeFile);
    const content = readFileSync(absoluteRoute, 'utf8');
    const record = buildInventoryRecord(routeFile, content);
    const violatesBoundary =
      record.lineCount > 20 ||
      record.hasDatabaseCall ||
      record.hasDirectApiCall ||
      record.hasStyleSheet;
    if (!violatesBoundary) continue;

    const feature = path.basename(routeFile).startsWith('_layout') ? 'navigation' : record.feature;
    const target = routeScreenTarget(routeFile, feature);
    const absoluteTarget = path.join(root, target.targetFile);
    if (existsSync(absoluteTarget)) {
      throw new Error(`Refusing to overwrite existing screen: ${target.targetFile}`);
    }
    mkdirSync(path.dirname(absoluteTarget), { recursive: true });
    renameSync(absoluteRoute, absoluteTarget);
    writeFileSync(absoluteRoute, `export { default } from '${target.importPath}';\n`);
    extracted.push(routeFile);
  }
  return extracted;
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? fileURLToPath(pathToFileURL(process.argv[1])) : '';
if (currentFile === invokedFile) {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim();
  const extracted = extractViolatingRoutes(root);
  console.info(`Extracted ${extracted.length} Expo route screen(s).`);
}
