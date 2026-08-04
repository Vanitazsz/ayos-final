import { describe, expect, it } from 'vitest';
import {
  averageRating,
  formatRating,
  ratingDistribution,
} from './reviewRatings';

describe('ratingDistribution', () => {
  it('counts published reviews per star', () => {
    const reviews = [
      { rating: 5, moderationStatus: 'PUBLISHED' },
      { rating: 5, moderationStatus: 'PUBLISHED' },
      { rating: 4, moderationStatus: 'PUBLISHED' },
      { rating: 1, moderationStatus: 'PUBLISHED' },
    ];
    expect(ratingDistribution(reviews)).toEqual({ 5: 2, 4: 1, 3: 0, 2: 0, 1: 1 });
  });

  it('excludes REJECTED reviews', () => {
    const reviews = [
      { rating: 5, moderationStatus: 'PUBLISHED' },
      { rating: 5, moderationStatus: 'REJECTED' },
      { rating: 1 },
    ];
    expect(ratingDistribution(reviews)).toEqual({ 5: 1, 4: 0, 3: 0, 2: 0, 1: 1 });
  });

  it('returns zeroed buckets for empty input', () => {
    expect(ratingDistribution([])).toEqual({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  });
});

describe('averageRating', () => {
  it('averages ratings including null-as-zero coercion', () => {
    expect(averageRating([{ stars: 5 }, { stars: 3 }, { stars: null }])).toBe(
      2.6666666666666665,
    );
  });

  it('returns 0 for no valid ratings', () => {
    expect(averageRating([{ stars: null }])).toBe(0);
  });
});

describe('formatRating', () => {
  it('formats to one decimal place', () => {
    expect(formatRating(4.25)).toBe('4.3');
    expect(formatRating(4)).toBe('4.0');
  });

  it('falls back for non-finite values', () => {
    expect(formatRating(Number.NaN)).toBe('0.0');
  });
});
