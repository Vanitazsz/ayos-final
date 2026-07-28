#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const get = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1];
};
const pattern = get('--pattern');
const pathIndex = args.indexOf('--paths');
const paths = pathIndex === -1 ? [] : args.slice(pathIndex + 1);
const quiet = args.includes('--quiet');
const extract = args.includes('--extract');
if (!pattern || !paths.length) process.exit(2);

let expression;
const javascriptPattern = pattern.replaceAll('[[:space:]]', '\\s');
try {
  expression = new RegExp(javascriptPattern, 'gmi');
} catch (error) {
  console.error(`Invalid search pattern: ${error.message}`);
  process.exit(2);
}

const ignored = (name) => name === '.git' || name === 'node_modules' || name.startsWith('.env');
const files = [];
async function collect(path) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch {
    files.push(path);
    return;
  }
  for (const entry of entries) {
    if (ignored(entry.name)) continue;
    const child = join(path, entry.name);
    if (entry.isDirectory()) await collect(child);
    else if (entry.isFile()) files.push(child);
  }
}
for (const path of paths) await collect(path);

const matches = new Set();
for (const file of files) {
  let source;
  try {
    source = await readFile(file, 'utf8');
  } catch {
    continue;
  }
  if (source.includes('\0')) continue;
  expression.lastIndex = 0;
  for (const match of source.matchAll(expression)) matches.add(extract ? match[0] : file);
}
if (!quiet) process.stdout.write(`${[...matches].sort().join('\n')}${matches.size ? '\n' : ''}`);
process.exit(matches.size ? 0 : 1);
