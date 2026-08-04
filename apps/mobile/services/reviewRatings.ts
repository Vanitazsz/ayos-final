export type ReviewRatingRow = { stars: unknown };

export function averageRating(rows: ReviewRatingRow[]): number {
  const ratings = rows
    .map((row) => Number(row.stars))
    .filter((rating) => Number.isFinite(rating));

  return ratings.length
    ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
    : 0;
}

export function formatRating(rating: number): string {
  return Number.isFinite(rating) ? rating.toFixed(1) : '0.0';
}

export interface DistributionReview {
  rating: number;
  moderationStatus?: string;
}

export function ratingDistribution(
  reviews: DistributionReview[],
): Record<number, number> {
  const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews
    .filter((review) => review.moderationStatus !== 'REJECTED')
    .forEach((review) => {
      dist[review.rating] = (dist[review.rating] || 0) + 1;
    });
  return dist;
}
