import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const presentationModule = (module) =>
  module === 'react' || module === 'lucide-react' || module.includes('/components/');

const identifiers = (node) => {
  const names = new Set();
  const visit = (child) => {
    if (ts.isIdentifier(child)) names.add(child.text);
    ts.forEachChild(child, visit);
  };
  visit(node);
  return names;
};

const bindingNames = (name, values) => {
  if (ts.isIdentifier(name)) values.push(name.text);
  else
    for (const element of name.elements)
      if (!ts.isOmittedExpression(element)) bindingNames(element.name, values);
};

const declaredNames = (statement) => {
  if (ts.isVariableStatement(statement)) {
    const values = [];
    for (const declaration of statement.declarationList.declarations)
      bindingNames(declaration.name, values);
    return values;
  }
  if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement))
    return statement.name ? [statement.name.text] : [];
  return [];
};

function renderImport(declaration, references) {
  const clause = declaration.importClause;
  if (!clause) return declaration.getText();
  const module = declaration.moduleSpecifier.text;
  const defaultName = clause.name && references.has(clause.name.text) ? clause.name.text : '';
  let binding = '';
  if (
    clause.namedBindings &&
    ts.isNamespaceImport(clause.namedBindings) &&
    references.has(clause.namedBindings.name.text)
  )
    binding = `* as ${clause.namedBindings.name.text}`;
  if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    const elements = clause.namedBindings.elements
      .filter((element) => references.has(element.name.text))
      .map((element) =>
        element.propertyName
          ? `${element.propertyName.text} as ${element.name.text}`
          : element.name.text,
      );
    if (elements.length) binding = `{ ${elements.join(', ')} }`;
  }
  if (!defaultName && !binding) return null;
  return `import ${[defaultName, binding].filter(Boolean).join(', ')} from '${module}';`;
}

export function extractAdminPageController(file, content) {
  const source = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JSX,
  );
  const defaultExport = source.statements.find(
    (statement) => ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression),
  );
  if (!defaultExport) return null;
  const componentName = defaultExport.expression.text;
  const componentStatement = source.statements.find((statement) => {
    if (!ts.isVariableStatement(statement)) return false;
    return statement.declarationList.declarations.some(
      (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === componentName,
    );
  });
  if (!componentStatement) return null;
  const declaration = componentStatement.declarationList.declarations.find(
    (item) => ts.isIdentifier(item.name) && item.name.text === componentName,
  );
  if (
    !declaration?.initializer ||
    !ts.isArrowFunction(declaration.initializer) ||
    !ts.isBlock(declaration.initializer.body) ||
    declaration.initializer.parameters.length
  )
    return null;
  const body = declaration.initializer.body;
  const returns = body.statements.filter(ts.isReturnStatement);
  if (returns.length !== 1 || !returns[0].expression) return null;
  const finalReturn = returns[0];
  const preamble = body.statements.filter((statement) => statement !== finalReturn);
  const modelNames = preamble
    .flatMap(declaredNames)
    .filter((name) => identifiers(finalReturn.expression).has(name));
  const topStatements = source.statements.filter(
    (statement) =>
      !ts.isImportDeclaration(statement) &&
      statement !== componentStatement &&
      statement !== defaultExport,
  );
  const controllerReferences = new Set(modelNames);
  for (const statement of [...preamble, ...topStatements])
    for (const name of identifiers(statement)) controllerReferences.add(name);
  const viewReferences = identifiers(finalReturn.expression);
  for (const statement of topStatements)
    for (const name of identifiers(statement)) viewReferences.add(name);
  const imports = source.statements.filter(ts.isImportDeclaration);
  const controllerImports = imports
    .map((item) => renderImport(item, controllerReferences))
    .filter(Boolean);
  const viewImports = imports
    .filter((item) => presentationModule(item.moduleSpecifier.text))
    .map((item) => renderImport(item, viewReferences))
    .filter(Boolean);
  const base = path.posix.basename(file, '.jsx');
  const featureRoot = path.posix.dirname(path.posix.dirname(file));
  const controllerName = `use${base}Controller`;
  const viewName = `${componentName}View`;
  return {
    controllerFile: `${featureRoot}/hooks/${controllerName}.jsx`,
    viewFile: `${path.posix.dirname(file)}/${base}.view.jsx`,
    controller: `${controllerImports.join('\n')}
${topStatements.map((item) => item.getText(source)).join('\n\n')}
export function ${controllerName}() {
${preamble.map((item) => item.getText(source)).join('\n')}
return { ${modelNames.join(', ')} };
}
`,
    view: `${viewImports.join('\n')}
${topStatements.map((item) => item.getText(source)).join('\n\n')}
export function ${viewName}({ model }) {
const { ${modelNames.join(', ')} } = model;
return ${finalReturn.expression.getText(source)};
}
`,
    page: `import { ${controllerName} } from '../hooks/${controllerName}';
import { ${viewName} } from './${base}.view';

const ${componentName} = () => <${viewName} model={${controllerName}()} />;
export default ${componentName};
`,
  };
}

function filesRecursively(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory()
      ? filesRecursively(absolute)
      : entry.isFile() && entry.name.endsWith('Page.jsx')
        ? [absolute]
        : [];
  });
}

export function extractAllAdminControllers(root) {
  const changed = [];
  for (const absolute of filesRecursively(path.join(root, 'apps/admin/src/features'))) {
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    const extraction = extractAdminPageController(relative, readFileSync(absolute, 'utf8'));
    if (!extraction || existsSync(path.join(root, extraction.controllerFile))) continue;
    mkdirSync(path.dirname(path.join(root, extraction.controllerFile)), { recursive: true });
    writeFileSync(path.join(root, extraction.controllerFile), extraction.controller);
    writeFileSync(path.join(root, extraction.viewFile), extraction.view);
    writeFileSync(absolute, extraction.page);
    changed.push(relative);
  }
  return changed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  console.info(`Extracted ${extractAllAdminControllers(root).length} Admin controller(s).`);
}
