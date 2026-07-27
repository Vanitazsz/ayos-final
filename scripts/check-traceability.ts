import { readFile } from 'node:fs/promises';

const document = await readFile(new URL('../REQUIREMENTS.md', import.meta.url), 'utf8');
const missing: string[] = [];

for (let index = 1; index <= 104; index += 1) {
  const id = `FR-${index.toString().padStart(2, '0')}`;
  if (!new RegExp(`\\|\\s*${id}\\s*\\|`).test(document)) missing.push(id);
}
for (let index = 1; index <= 18; index += 1) {
  const id = `NFR-${index.toString().padStart(2, '0')}`;
  if (!new RegExp(`\\|\\s*${id}\\s*\\|`).test(document)) missing.push(id);
}

if (missing.length) {
  throw new Error(`Missing traceability entries: ${missing.join(', ')}`);
}
console.info('Traceability catalog contains FR-01–FR-104 and NFR-01–NFR-18.');
