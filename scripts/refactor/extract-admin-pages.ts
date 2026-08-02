import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { analyzeContent } from './analyze-repository.js';

function kebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function adminPageTarget(pageFile: string): {
  feature: string;
  importPath: string;
  targetFile: string;
} {
  const name = path.posix.basename(pageFile, path.posix.extname(pageFile));
  const feature = pageFile.includes('/pages/auth/') ? 'auth' : kebabCase(name);
  const targetFile = `apps/admin/src/features/${feature}/pages/${name}Page.jsx`;
  let importPath = path.posix.relative(
    path.posix.dirname(pageFile),
    targetFile.replace(/\.jsx$/, ''),
  );
  if (!importPath.startsWith('.')) importPath = `./${importPath}`;
  return { feature, importPath, targetFile };
}

export function rewriteRelativeModuleSpecifiers(
  content: string,
  originalFile: string,
  targetFile: string,
): string {
  return content.replace(
    /((?:from\s+|import\s*\(|require\s*\()\s*)(['"])(\.[^'"]+)\2/g,
    (match, prefix: string, quote: string, specifier: string) => {
      const resolved = path.posix.normalize(
        path.posix.join(path.posix.dirname(originalFile), specifier),
      );
      let relative = path.posix.relative(path.posix.dirname(targetFile), resolved);
      if (!relative.startsWith('.')) relative = `./${relative}`;
      return `${prefix}${quote}${relative}${quote}`;
    },
  );
}

export function extractAdminPages(root: string): string[] {
  const pages = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', 'apps/admin/src/pages/**/*.jsx'],
    { cwd: root, encoding: 'utf8' },
  )
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => existsSync(path.join(root, file)));
  const extracted: string[] = [];
  for (const pageFile of pages) {
    const absolutePage = path.join(root, pageFile);
    const content = readFileSync(absolutePage, 'utf8');
    const analysis = analyzeContent(content);
    if (analysis.lineCount <= 50 && !analysis.hasDatabaseCall && !analysis.hasDirectApiCall) {
      continue;
    }
    const target = adminPageTarget(pageFile);
    const absoluteTarget = path.join(root, target.targetFile);
    if (existsSync(absoluteTarget)) {
      throw new Error(`Refusing to overwrite existing Admin page: ${target.targetFile}`);
    }
    mkdirSync(path.dirname(absoluteTarget), { recursive: true });
    writeFileSync(
      absoluteTarget,
      rewriteRelativeModuleSpecifiers(content, pageFile, target.targetFile),
    );
    writeFileSync(absolutePage, `export { default } from '${target.importPath}';\n`);
    extracted.push(pageFile);
  }
  return extracted;
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? fileURLToPath(pathToFileURL(process.argv[1])) : '';
if (currentFile === invokedFile) {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim();
  console.info(`Extracted ${extractAdminPages(root).length} Admin page(s).`);
}
