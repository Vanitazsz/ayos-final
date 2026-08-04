import type { ReviewData } from '@/services/reviews';

export const REVIEW_FILTER_OPTIONS = [
  'All',
  '5 Stars',
  '4 Stars',
  '3 Stars',
  'Recent',
] as const;

export type ReviewFilter = (typeof REVIEW_FILTER_OPTIONS)[number];

export function filterReviews(
  reviews: ReviewData[],
  activeFilter: ReviewFilter,
): ReviewData[] {
  if (activeFilter === 'All') return reviews;
  if (activeFilter === '5 Stars')
    return reviews.filter((r) => r.rating === 5);
  if (activeFilter === '4 Stars')
    return reviews.filter((r) => r.rating === 4);
  if (activeFilter === '3 Stars')
    return reviews.filter((r) => r.rating === 3);
  if (activeFilter === 'Recent')
    return [...reviews].sort((a, b) => a.date.localeCompare(b.date));
  return reviews;
}

export function ratedReviewCount(
  reviews: ReviewData[],
): number {
  return Object.values(
    reviews.reduce(
      (acc, r) => {
        acc[r.rating] = (acc[r.rating] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    ),
  ).reduce((total, count) => total + count, 0);
}
