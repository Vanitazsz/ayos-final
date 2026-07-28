export type WorkerEarnings = {
  durationMinutes: number;
  billingBlocks: number;
  baseRatePerTenMinutes: 14;
  baseEarnings: number;
  customerBudgetLimit: number;
  workerMinimumEarnings: number;
  workerMaximumEarnings: number;
  finalWorkerEarnings: number;
};

export function calculateWorkerEarnings(durationMinutes: number, customerBudgetLimit: number, workerMinimumEarnings = 14, workerMaximumEarnings = Number.POSITIVE_INFINITY): WorkerEarnings {
  const duration = Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 0;
  const blocks = Math.ceil(duration / 10);
  const base = blocks * 14;
  const budget = Number.isFinite(customerBudgetLimit) && customerBudgetLimit > 0 ? customerBudgetLimit : 0;
  const minimum = Math.max(0, workerMinimumEarnings);
  const maximum = Math.max(minimum, workerMaximumEarnings, 0);
  const capped = Math.min(base, budget || base, maximum);
  const final = Math.max(0, Math.min(capped, maximum));
  return { durationMinutes: duration, billingBlocks: blocks, baseRatePerTenMinutes: 14, baseEarnings: base, customerBudgetLimit: budget, workerMinimumEarnings: minimum, workerMaximumEarnings: maximum, finalWorkerEarnings: Math.round(final * 100) / 100 };
}
