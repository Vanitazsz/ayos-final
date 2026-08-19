import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

export interface LogicExtraction {
  screen: string;
  logicModule: string;
  logicFile: string;
}

function isLogicDependency(module: string): boolean {
  return (
    /^@\/services\//.test(module) ||
    module === '@/lib/supabase' ||
    /^expo-(location|image-picker|camera|audio)$/.test(module) ||
    /(?:^|\/)services\/profileData$/.test(module)
  );
}

function renderReexport(
  declaration: ts.ImportDeclaration,
  sourceFile: ts.SourceFile,
): { line: string; locals: Array<{ name: string; typeOnly: boolean }> } | null {
  const clause = declaration.importClause;
  if (!clause) return null;
  const module = (declaration.moduleSpecifier as ts.StringLiteral).text;
  const exports: string[] = [];
  const locals: Array<{ name: string; typeOnly: boolean }> = [];
  if (clause.name) {
    exports.push(`default as ${clause.name.text}`);
    locals.push({ name: clause.name.text, typeOnly: clause.isTypeOnly });
  }
  if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
    const local = clause.namedBindings.name.text;
    locals.push({ name: local, typeOnly: clause.isTypeOnly });
    return {
      line: `export * as ${local} from '${module}';`,
      locals,
    };
  }
  if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    for (const element of clause.namedBindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text;
      const local = element.name.text;
      const typeOnly = clause.isTypeOnly || element.isTypeOnly;
      const value = imported === local ? local : `${imported} as ${local}`;
      exports.push(typeOnly ? `type ${value}` : value);
      locals.push({ name: local, typeOnly });
    }
  }
  if (!exports.length) return null;
  return {
    line: `export { ${exports.join(', ')} } from '${module}';`,
    locals,
  };
}

function logicTarget(file: string): { importPath: string; logicFile: string } {
  const extension = file.endsWith('.jsx') ? '.js' : '.ts';
  const base = path.posix.basename(file).replace(/\.(tsx|jsx)$/, '');
  const parent = path.posix.dirname(path.posix.dirname(file));
  const logicFile = `${parent}/logic/${base}Logic${extension}`;
  let importPath = path.posix.relative(
    path.posix.dirname(file),
    logicFile.replace(/\.(ts|js)$/, ''),
  );
  if (!importPath.startsWith('.')) importPath = `./${importPath}`;
  return { importPath, logicFile };
}

export function extractLogicGateway(file: string, content: string): LogicExtraction | null {
  const scriptKind = file.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, scriptKind);
  const edits: Array<{ start: number; end: number }> = [];
  const lines: string[] = [];
  const locals: Array<{ name: string; typeOnly: boolean }> = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const module = (statement.moduleSpecifier as ts.StringLiteral).text;
    if (!isLogicDependency(module)) continue;
    const rendered = renderReexport(statement, sourceFile);
    if (!rendered) continue;
    lines.push(rendered.line);
    locals.push(...rendered.locals);
    edits.push({ start: statement.getFullStart(), end: statement.end });
  }
  if (!lines.length) return null;
  const target = logicTarget(file);
  const importNames = locals
    .filter(
      (local, index) => locals.findIndex((candidate) => candidate.name === local.name) === index,
    )
    .map((local) => (local.typeOnly ? `type ${local.name}` : local.name))
    .join(', ');
  const withoutDependencies = edits
    .sort((a, b) => b.start - a.start)
    .reduce(
      (current, edit) => `${current.slice(0, edit.start)}${current.slice(edit.end)}`,
      content,
    );
  return {
    screen: `import { ${importNames} } from '${target.importPath}';\n${withoutDependencies.trimStart()}`,
    logicModule: `${lines.join('\n')}\n`,
    logicFile: target.logicFile,
  };
}

function filesRecursively(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesRecursively(absolute);
    return entry.isFile() && /\.(tsx|jsx)$/.test(entry.name) ? [absolute] : [];
  });
}

export function extractAllLogicGateways(root: string): string[] {
  const roots = [path.join(root, 'src/features')];
  const changed: string[] = [];
  for (const absolute of roots.flatMap(filesRecursively)) {
    if (!absolute.includes(`${path.sep}screens${path.sep}`)) continue;
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    const extraction = extractLogicGateway(relative, readFileSync(absolute, 'utf8'));
    if (!extraction) continue;
    const absoluteLogic = path.join(root, extraction.logicFile);
    if (existsSync(absoluteLogic)) throw new Error(`Refusing to overwrite ${extraction.logicFile}`);
    mkdirSync(path.dirname(absoluteLogic), { recursive: true });
    writeFileSync(absolute, extraction.screen);
    writeFileSync(absoluteLogic, extraction.logicModule);
    changed.push(relative);
  }
  return changed;
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? fileURLToPath(pathToFileURL(process.argv[1])) : '';
if (currentFile === invokedFile) {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim();
  console.info(`Extracted ${extractAllLogicGateways(root).length} feature logic gateway(s).`);
}
