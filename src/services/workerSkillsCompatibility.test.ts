import { describe, expect, it } from 'vitest';
import { filterWorkerSkillsForIndustries } from '@/utils/workerSkills';

const catalog = [
  { id: 'industry-a', skills: [{ id: 'skill-a' }] },
  { id: 'industry-b', skills: [{ id: 'skill-b' }] },
];

describe('filterWorkerSkillsForIndustries', () => {
  it('drops skills and rates outside the selected industries', () => {
    expect(
      filterWorkerSkillsForIndustries(
        ['skill-a', 'skill-b'],
        { 'skill-a': 1000, 'skill-b': 2000 },
        catalog,
        ['industry-a'],
      ),
    ).toEqual({ skillIds: ['skill-a'], rates: { 'skill-a': 1000 } });
  });

  it('returns no skills when no industry is selected', () => {
    expect(
      filterWorkerSkillsForIndustries(
        ['skill-a'],
        { 'skill-a': 1000 },
        catalog,
        [],
      ),
    ).toEqual({ skillIds: [], rates: {} });
  });
});
