import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const tabRouteDirectories = [
  resolve(currentDirectory, '../app/(tabs)'),
  resolve(currentDirectory, '../app/(worker)'),
];

describe('tab route structure', () => {
  it('does not place stylesheet modules in tab route directories', () => {
    const stylesheetModules = tabRouteDirectories.flatMap((directory) =>
      readdirSync(directory)
        .filter((entry) => entry.endsWith('.styles.ts'))
        .map((entry) => `${directory}/${entry}`),
    );

    expect(stylesheetModules).toEqual([]);
  });
});
