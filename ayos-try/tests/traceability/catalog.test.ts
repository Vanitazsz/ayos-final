import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const catalog = JSON.parse(
  readFileSync(new URL('../../requirements/catalog.json', import.meta.url), 'utf8'),
) as Array<{ id: string; text: string }>;

describe('requirement catalog', () => {
  it('contains every functional and non-functional identifier exactly once', () => {
    const ids = catalog.map((item) => item.id);
    expect(new Set(ids).size).toBe(122);
    for (let index = 1; index <= 104; index += 1)
      expect(ids).toContain(`FR-${index.toString().padStart(2, '0')}`);
    for (let index = 1; index <= 18; index += 1)
      expect(ids).toContain(`NFR-${index.toString().padStart(2, '0')}`);
  });

  it('does not contain empty requirement statements', () => {
    expect(catalog.every((item) => item.text.trim().length > 10)).toBe(true);
  });
});
