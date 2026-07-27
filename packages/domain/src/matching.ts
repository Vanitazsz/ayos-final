export interface MatchableWorker {
  id: string;
  approved: boolean;
  available: boolean;
  categoryIds: readonly string[];
  distanceKm: number;
  rating: number;
  reviewCount: number;
  scheduleFit: boolean;
  recommendationPriority: boolean;
}

export interface WorkerMatch {
  workerId: string;
  eligible: boolean;
  score: number;
  factors: {
    skill: number;
    schedule: number;
    distance: number;
    reputation: number;
    priority: number;
  };
}

export function rankWorkers(
  workers: readonly MatchableWorker[],
  categoryId: string,
  maximumDistanceKm = 30,
): WorkerMatch[] {
  return workers
    .map((worker): WorkerMatch => {
      const skill = worker.categoryIds.includes(categoryId) ? 40 : 0;
      const schedule = worker.scheduleFit ? 25 : 0;
      const distance = Math.max(0, 20 * (1 - worker.distanceKm / maximumDistanceKm));
      const reputation = Math.min(
        10,
        (worker.rating / 5) * 8 + Math.min(2, worker.reviewCount / 50),
      );
      const priority = worker.recommendationPriority ? 5 : 0;
      const eligible =
        worker.approved &&
        worker.available &&
        skill > 0 &&
        schedule > 0 &&
        worker.distanceKm <= maximumDistanceKm;

      return {
        workerId: worker.id,
        eligible,
        score: eligible
          ? Math.round((skill + schedule + distance + reputation + priority) * 100) / 100
          : 0,
        factors: { skill, schedule, distance, reputation, priority },
      };
    })
    .filter((match) => match.eligible)
    .sort((left, right) => right.score - left.score || left.workerId.localeCompare(right.workerId))
    .slice(0, 5);
}
