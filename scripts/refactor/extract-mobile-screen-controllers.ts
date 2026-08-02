import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export interface ControllerExtraction {
  controller: string;
  controllerFile: string;
  screen: string;
  view: string;
  viewFile: string;
}

const presentationModule = (module: string) =>
  module === 'react' ||
  module === 'react-native' ||
  module.startsWith('lucide-react') ||
  module.startsWith('@/components/') ||
  module === '@/constants/theme' ||
  module.endsWith('.styles');

function identifiers(node: ts.Node): Set<string> {
  const values = new Set<string>();
  const visit = (child: ts.Node) => {
    if (ts.isIdentifier(child)) values.add(child.text);
    ts.forEachChild(child, visit);
  };
  visit(node);
  return values;
}

function bindingNames(name: ts.BindingName, values: string[]) {
  if (ts.isIdentifier(name)) values.push(name.text);
  else
    for (const element of name.elements) {
      if (!ts.isOmittedExpression(element)) bindingNames(element.name, values);
    }
}

function declaredNames(statement: ts.Statement): string[] {
  if (ts.isVariableStatement(statement)) {
    const values: string[] = [];
    for (const declaration of statement.declarationList.declarations)
      bindingNames(declaration.name, values);
    return values;
  }
  if (
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isEnumDeclaration(statement)
  )
    return statement.name ? [statement.name.text] : [];
  return [];
}

function containsJsx(node: ts.Node): boolean {
  let found = false;
  const visit = (child: ts.Node) => {
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function containsComponentFlowReturn(node: ts.Node): boolean {
  let found = false;
  const visit = (child: ts.Node) => {
    if (child !== node && ts.isFunctionLike(child)) return;
    if (ts.isReturnStatement(child)) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function importLocals(declaration: ts.ImportDeclaration) {
  const values: string[] = [];
  const clause = declaration.importClause;
  if (!clause) return values;
  if (clause.name) values.push(clause.name.text);
  if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings))
    values.push(clause.namedBindings.name.text);
  if (clause.namedBindings && ts.isNamedImports(clause.namedBindings))
    values.push(...clause.namedBindings.elements.map((item) => item.name.text));
  return values;
}

function renderImport(declaration: ts.ImportDeclaration, keep: Set<string>): string | null {
  const clause = declaration.importClause;
  if (!clause) return declaration.getText();
  const module = (declaration.moduleSpecifier as ts.StringLiteral).text;
  const defaultName = clause.name && keep.has(clause.name.text) ? clause.name.text : '';
  let binding = '';
  if (
    clause.namedBindings &&
    ts.isNamespaceImport(clause.namedBindings) &&
    keep.has(clause.namedBindings.name.text)
  )
    binding = `* as ${clause.namedBindings.name.text}`;
  if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    const elements = clause.namedBindings.elements
      .filter((element) => keep.has(element.name.text))
      .map((element) => {
        const imported = element.propertyName?.text;
        const value = imported ? `${imported} as ${element.name.text}` : element.name.text;
        return element.isTypeOnly ? `type ${value}` : value;
      });
    if (elements.length) binding = `{ ${elements.join(', ')} }`;
  }
  if (!defaultName && !binding) return null;
  const names = [defaultName, binding].filter(Boolean).join(', ');
  return `${clause.isTypeOnly ? 'import type' : 'import'} ${names} from '${module}';`;
}

function topLevelClosure(
  statements: ts.Statement[],
  initialReferences: Set<string>,
): ts.Statement[] {
  const selected = new Set<ts.Statement>();
  const needed = new Set(initialReferences);
  let changed = true;
  while (changed) {
    changed = false;
    for (const statement of statements) {
      if (selected.has(statement)) continue;
      if (!declaredNames(statement).some((name) => needed.has(name))) continue;
      selected.add(statement);
      for (const name of identifiers(statement)) needed.add(name);
      changed = true;
    }
  }
  return statements.filter((statement) => selected.has(statement));
}

export function extractMobileScreenController(
  file: string,
  content: string,
): ControllerExtraction | null {
  const source = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const component = source.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) &&
      Boolean(statement.modifiers?.some((item) => item.kind === ts.SyntaxKind.DefaultKeyword)),
  );
  if (!component?.name || !component.body || component.parameters.length) return null;
  const directReturns = component.body.statements.filter(ts.isReturnStatement);
  if (directReturns.length !== 1 || !directReturns[0].expression) return null;
  const returnStatement = directReturns[0];
  const preamble = component.body.statements.filter((item) => item !== returnStatement);
  if (preamble.some(containsComponentFlowReturn)) return null;

  const localOrder = preamble.flatMap(declaredNames);
  const viewReferences = identifiers(returnStatement.expression);
  const imports = source.statements.filter(ts.isImportDeclaration);
  const controllerOnlyImported = new Set<string>();
  for (const declaration of imports) {
    const module = (declaration.moduleSpecifier as ts.StringLiteral).text;
    if (presentationModule(module)) continue;
    for (const name of importLocals(declaration))
      if (viewReferences.has(name)) controllerOnlyImported.add(name);
  }
  const modelNames = [
    ...localOrder.filter((name) => viewReferences.has(name)),
    ...controllerOnlyImported,
  ].filter((name, index, all) => all.indexOf(name) === index);

  const topStatements = source.statements.filter(
    (statement) => !ts.isImportDeclaration(statement) && statement !== component,
  );
  const controllerReferences = new Set<string>();
  for (const statement of preamble)
    for (const name of identifiers(statement)) controllerReferences.add(name);
  for (const name of modelNames) controllerReferences.add(name);
  const controllerTop = topLevelClosure(topStatements, controllerReferences);
  for (const statement of controllerTop)
    for (const name of identifiers(statement)) controllerReferences.add(name);

  const viewTop = topLevelClosure(topStatements, viewReferences);
  for (const statement of viewTop)
    for (const name of identifiers(statement)) viewReferences.add(name);

  const controllerImports = imports
    .map((declaration) => renderImport(declaration, controllerReferences))
    .filter(Boolean);
  const viewImports = imports
    .map((declaration) => {
      const module = (declaration.moduleSpecifier as ts.StringLiteral).text;
      if (!presentationModule(module)) return null;
      return renderImport(declaration, viewReferences);
    })
    .filter(Boolean);

  const base = path.posix.basename(file, '.tsx');
  const featureRoot = path.posix.dirname(path.posix.dirname(file));
  const controllerName = `use${base}Controller`;
  const viewName = `${component.name.text.replace(/Screen$/, '')}View`;
  const controllerFile = `${featureRoot}/hooks/${controllerName}.${preamble.some(containsJsx) ? 'tsx' : 'ts'}`;
  const viewFile = `${path.posix.dirname(file)}/${base}.view.tsx`;
  const controllerBody = preamble.map((item) => item.getText(source)).join('\n');
  const controller = `${controllerImports.join('\n')}
${controllerTop.map((item) => item.getText(source)).join('\n\n')}
export function ${controllerName}() {
${controllerBody}
return { ${modelNames.join(', ')} };
}
`;
  const view = `${viewImports.join('\n')}
import type { ${controllerName} } from '../hooks/${controllerName}';
${viewTop.map((item) => item.getText(source)).join('\n\n')}
export function ${viewName}({ model }: { model: ReturnType<typeof ${controllerName}> }) {
const { ${modelNames.join(', ')} } = model;
return ${returnStatement.expression.getText(source)};
}
`;
  const screen = `import { ${controllerName} } from '../hooks/${controllerName}';
import { ${viewName} } from './${base}.view';

export default function ${component.name.text}() {
  const model = ${controllerName}();
  return <${viewName} model={model} />;
}
`;
  return { controller, controllerFile, screen, view, viewFile };
}

function filesRecursively(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory()
      ? filesRecursively(absolute)
      : entry.isFile() && entry.name.endsWith('Screen.tsx')
        ? [absolute]
        : [];
  });
}

export function extractAllMobileControllers(root: string): string[] {
  const changed: string[] = [];
  for (const absolute of filesRecursively(path.join(root, 'apps/mobile/features'))) {
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    const extraction = extractMobileScreenController(relative, readFileSync(absolute, 'utf8'));
    if (!extraction) continue;
    if (existsSync(path.join(root, extraction.controllerFile))) continue;
    mkdirSync(path.dirname(path.join(root, extraction.controllerFile)), {
      recursive: true,
    });
    writeFileSync(path.join(root, extraction.controllerFile), extraction.controller);
    writeFileSync(path.join(root, extraction.viewFile), extraction.view);
    writeFileSync(absolute, extraction.screen);
    changed.push(relative);
  }
  return changed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim();
  console.info(`Extracted ${extractAllMobileControllers(root).length} mobile controller(s).`);
}
