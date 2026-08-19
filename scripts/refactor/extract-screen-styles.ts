import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

interface ImportBinding {
  module: string;
  imported: string;
  local: string;
  kind: 'default' | 'namespace' | 'named';
  typeOnly: boolean;
}

export interface StyleExtraction {
  screen: string;
  styleModule: string;
  styleFile: string;
}

function identifierDependencies(node: ts.Node): Set<string> {
  const identifiers = new Set<string>();
  const visit = (child: ts.Node) => {
    if (ts.isIdentifier(child)) {
      const parent = child.parent;
      const isPropertyName =
        (ts.isPropertyAccessExpression(parent) && parent.name === child) ||
        (ts.isPropertyAssignment(parent) && parent.name === child) ||
        (ts.isMethodDeclaration(parent) && parent.name === child) ||
        (ts.isPropertyDeclaration(parent) && parent.name === child);
      const isDeclarationName =
        (ts.isVariableDeclaration(parent) && parent.name === child) ||
        (ts.isFunctionDeclaration(parent) && parent.name === child) ||
        (ts.isClassDeclaration(parent) && parent.name === child) ||
        (ts.isInterfaceDeclaration(parent) && parent.name === child) ||
        (ts.isTypeAliasDeclaration(parent) && parent.name === child) ||
        (ts.isParameter(parent) && parent.name === child);
      if (!isPropertyName && !isDeclarationName) identifiers.add(child.text);
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return identifiers;
}

function importBindings(sourceFile: ts.SourceFile): Map<string, ImportBinding> {
  const bindings = new Map<string, ImportBinding>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
    const module = (statement.moduleSpecifier as ts.StringLiteral).text;
    const clause = statement.importClause;
    if (clause.name) {
      bindings.set(clause.name.text, {
        module,
        imported: 'default',
        local: clause.name.text,
        kind: 'default',
        typeOnly: clause.isTypeOnly,
      });
    }
    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      const local = clause.namedBindings.name.text;
      bindings.set(local, {
        module,
        imported: '*',
        local,
        kind: 'namespace',
        typeOnly: clause.isTypeOnly,
      });
    }
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        const local = element.name.text;
        bindings.set(local, {
          module,
          imported: element.propertyName?.text ?? local,
          local,
          kind: 'named',
          typeOnly: clause.isTypeOnly || element.isTypeOnly,
        });
      }
    }
  }
  return bindings;
}

function topLevelDeclarations(sourceFile: ts.SourceFile): Map<string, ts.Statement> {
  const declarations = new Map<string, ts.Statement>();
  const bindingNames = (name: ts.BindingName): string[] => {
    if (ts.isIdentifier(name)) return [name.text];
    return name.elements.flatMap((element) =>
      ts.isOmittedExpression(element) ? [] : bindingNames(element.name),
    );
  };
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        for (const name of bindingNames(declaration.name)) declarations.set(name, statement);
      }
      continue;
    }
    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      declarations.set(statement.name.text, statement);
    }
  }
  return declarations;
}

function renderImports(bindings: ImportBinding[]): string {
  const byModule = new Map<string, ImportBinding[]>();
  for (const binding of bindings) {
    const list = byModule.get(binding.module) ?? [];
    if (!list.some((candidate) => candidate.local === binding.local)) list.push(binding);
    byModule.set(binding.module, list);
  }
  const lines: string[] = [];
  for (const [module, moduleBindings] of [...byModule.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const defaultBinding = moduleBindings.find((binding) => binding.kind === 'default');
    const namespaceBinding = moduleBindings.find((binding) => binding.kind === 'namespace');
    const namedBindings = moduleBindings.filter((binding) => binding.kind === 'named');
    const parts: string[] = [];
    if (defaultBinding) parts.push(defaultBinding.local);
    if (namespaceBinding) parts.push(`* as ${namespaceBinding.local}`);
    if (namedBindings.length) {
      const named = namedBindings
        .sort((a, b) => a.local.localeCompare(b.local))
        .map((binding) => {
          const value =
            binding.imported === binding.local
              ? binding.local
              : `${binding.imported} as ${binding.local}`;
          return binding.typeOnly ? `type ${value}` : value;
        })
        .join(', ');
      parts.push(`{ ${named} }`);
    }
    const allTypeOnly = moduleBindings.every((binding) => binding.typeOnly);
    lines.push(`import${allTypeOnly ? ' type' : ''} ${parts.join(', ')} from '${module}';`);
  }
  return lines.join('\n');
}

function removeStyleSheetImport(content: string, sourceFile: ts.SourceFile): string {
  if ((content.match(/\bStyleSheet\b/g) ?? []).length > 2) return content;
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const edits: Array<{ start: number; end: number; replacement: string }> = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
    if ((statement.moduleSpecifier as ts.StringLiteral).text !== 'react-native') continue;
    const bindings = statement.importClause.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    if (!bindings.elements.some((element) => element.name.text === 'StyleSheet')) continue;
    const elements = bindings.elements.filter((element) => element.name.text !== 'StyleSheet');
    const clause = ts.factory.updateImportClause(
      statement.importClause,
      statement.importClause.isTypeOnly,
      statement.importClause.name,
      elements.length ? ts.factory.createNamedImports(elements) : undefined,
    );
    const replacement =
      clause.name || clause.namedBindings
        ? printer.printNode(
            ts.EmitHint.Unspecified,
            ts.factory.updateImportDeclaration(
              statement,
              statement.modifiers,
              clause,
              statement.moduleSpecifier,
              statement.attributes,
            ),
            sourceFile,
          )
        : '';
    edits.push({ start: statement.getStart(sourceFile), end: statement.end, replacement });
  }
  return edits
    .sort((a, b) => b.start - a.start)
    .reduce(
      (current, edit) =>
        `${current.slice(0, edit.start)}${edit.replacement}${current.slice(edit.end)}`,
      content,
    );
}

export function extractStyleModule(file: string, content: string): StyleExtraction | null {
  const sourceFile = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const styleStatement = sourceFile.statements.find((statement) => {
    if (!ts.isVariableStatement(statement)) return false;
    return statement.declarationList.declarations.some(
      (declaration) =>
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === 'styles' &&
        declaration.initializer &&
        ts.isCallExpression(declaration.initializer) &&
        declaration.initializer.expression.getText(sourceFile) === 'StyleSheet.create',
    );
  });
  if (!styleStatement || !ts.isVariableStatement(styleStatement)) return null;
  const styleDeclaration = styleStatement.declarationList.declarations.find(
    (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === 'styles',
  );
  if (!styleDeclaration?.initializer) return null;

  const imports = importBindings(sourceFile);
  const declarations = topLevelDeclarations(sourceFile);
  const neededImports = new Map<string, ImportBinding>();
  const neededStatements = new Map<number, ts.Statement>();
  const queue = [...identifierDependencies(styleDeclaration.initializer)];
  const visited = new Set<string>();
  while (queue.length) {
    const identifier = queue.shift()!;
    if (visited.has(identifier) || identifier === 'styles') continue;
    visited.add(identifier);
    const binding = imports.get(identifier);
    if (binding) {
      neededImports.set(binding.local, binding);
      continue;
    }
    const declaration = declarations.get(identifier);
    if (declaration && declaration !== styleStatement) {
      neededStatements.set(declaration.pos, declaration);
      for (const dependency of identifierDependencies(declaration)) queue.push(dependency);
    }
  }

  const styleFile = file.replace(/\.tsx$/, '.styles.ts');
  const styleImport = `./${path.basename(styleFile, '.ts')}`;
  const withoutImport = removeStyleSheetImport(content, sourceFile);
  const reparsed = ts.createSourceFile(
    file,
    withoutImport,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const reparsedStyle = reparsed.statements.find(
    (statement) =>
      ts.isVariableStatement(statement) &&
      statement.getText(reparsed).includes('StyleSheet.create'),
  );
  if (!reparsedStyle) throw new Error(`Unable to locate reparsed styles in ${file}`);
  const screenWithoutStyles = `${withoutImport.slice(0, reparsedStyle.getFullStart())}${withoutImport.slice(reparsedStyle.end)}`;
  const screen = `import { styles } from '${styleImport}';\n${screenWithoutStyles.trimStart()}`;
  const declarationsText = [...neededStatements.values()]
    .sort((a, b) => a.pos - b.pos)
    .map((statement) => statement.getText(sourceFile))
    .join('\n\n');
  const styleText = styleStatement
    .getText(sourceFile)
    .replace(/^(?:export\s+)?const\s+styles\s*=/, 'export const styles =');
  const styleModule = `${renderImports([...neededImports.values()])}\n\n${declarationsText ? `${declarationsText}\n\n` : ''}${styleText}\n`;
  return { screen, styleModule, styleFile };
}

function screenFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return screenFiles(absolute);
    return entry.isFile() && entry.name.endsWith('.tsx') ? [absolute] : [];
  });
}

export function extractAllScreenStyles(root: string): string[] {
  const featureRoot = path.join(root, 'src/features');
  const changed: string[] = [];
  for (const absolute of screenFiles(featureRoot)) {
    if (!absolute.includes(`${path.sep}screens${path.sep}`)) continue;
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    const extraction = extractStyleModule(relative, readFileSync(absolute, 'utf8'));
    if (!extraction) continue;
    const absoluteStyle = path.join(root, extraction.styleFile);
    if (existsSync(absoluteStyle)) throw new Error(`Refusing to overwrite ${extraction.styleFile}`);
    mkdirSync(path.dirname(absoluteStyle), { recursive: true });
    writeFileSync(absolute, extraction.screen);
    writeFileSync(absoluteStyle, extraction.styleModule);
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
  const changed = extractAllScreenStyles(root);
  console.info(`Extracted ${changed.length} screen style module(s).`);
}
