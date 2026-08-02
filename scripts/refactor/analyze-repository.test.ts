import { describe, expect, it } from 'vitest';
import {
  analyzeContent,
  buildInventoryRecord,
  chunkFiles,
  findCycles,
} from './analyze-repository.js';

describe('analyzeContent', () => {
  it('detects responsibility violations without counting harmless text', () => {
    const result = analyzeContent(`
      import { StyleSheet } from 'react-native';
      import { supabase } from '@/lib/supabase';
      type Unsafe = Record<string, any>;
      const styles = StyleSheet.create({ card: { color: '#ff0000' } });
      export const load = () => supabase.from('bookings').select('*');
    `);

    expect(result).toMatchObject({
      hasDatabaseCall: true,
      hasDirectApiCall: false,
      hasStyleSheet: true,
      hardcodedColorCount: 1,
      anyCount: 1,
      tsIgnoreCount: 0,
      disabledLintCount: 0,
    });
    expect(result.databaseTables).toEqual(['bookings']);
  });
});

describe('buildInventoryRecord', () => {
  it('flags a styled route with raw database access for refactoring', () => {
    const record = buildInventoryRecord(
      'apps/mobile/app/booking/[id].tsx',
      `import { StyleSheet } from 'react-native';\n` +
        `supabase.from('bookings').select('*');\n` +
        `const styles = StyleSheet.create({});\n`,
    );

    expect(record.type).toBe('ROUTE');
    expect(record.feature).toBe('bookings');
    expect(record.risk).toBe('HIGH');
    expect(record.problems).toContain('Raw database access in route');
    expect(record.problems).toContain('Route owns presentation styles');
    expect(record.status).toBe('PENDING');
  });

  it('classifies tests, generated code, configuration, and legacy code safely', () => {
    expect(buildInventoryRecord('apps/mobile/services/auth.test.ts', '').status).toBe('TEST FILE');
    expect(buildInventoryRecord('packages/supabase/src/database.generated.ts', '').status).toBe(
      'GENERATED — DO NOT EDIT',
    );
    expect(buildInventoryRecord('apps/mobile/tsconfig.json', '{}').status).toBe(
      'CONFIGURATION FILE',
    );
    expect(buildInventoryRecord('backend/src/app.ts', '').status).toBe(
      'DEPRECATED — SAFE REMOVAL PROPOSED',
    );
  });
});

describe('findCycles', () => {
  it('returns each import cycle once', () => {
    const cycles = findCycles(
      new Map([
        ['a.ts', ['b.ts']],
        ['b.ts', ['c.ts']],
        ['c.ts', ['a.ts']],
        ['leaf.ts', []],
      ]),
    );

    expect(cycles).toEqual([['a.ts', 'b.ts', 'c.ts', 'a.ts']]);
  });
});

describe('chunkFiles', () => {
  it('creates complete migration sub-batches with no more than fifteen files', () => {
    const files = Array.from({ length: 31 }, (_, index) => `file-${index}.ts`);
    const chunks = chunkFiles(files, 15);

    expect(chunks.map((chunk) => chunk.length)).toEqual([15, 15, 1]);
    expect(chunks.flat()).toEqual(files);
  });
});
