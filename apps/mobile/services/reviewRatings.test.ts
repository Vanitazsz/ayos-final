import { describe, expect, it } from 'vitest';

import { averageRating, formatRating } from './reviewRatings';

describe('review ratings', () => {
  it('returns zero for an empty set', () => {
    expect(averageRating([])).toBe(0);
  });

  it('averages numeric star values', () => {
    expect(averageRating([{ stars: 5 }, { stars: '3' }])).toBe(4);
  });

  it('formats ratings consistently to one decimal place', () => {
    expect(formatRating(4)).toBe('4.0');
    expect(formatRating(Number.NaN)).toBe('0.0');
  });
});
