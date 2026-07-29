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
