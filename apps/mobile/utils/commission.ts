const MAX_COMMISSION_RATE_PERCENT = 50;

export function normalizeCommissionRatePercent(value: unknown): number {
  const rate = Number(value);
  if (
    !Number.isFinite(rate) ||
    rate < 0 ||
    rate > MAX_COMMISSION_RATE_PERCENT
  ) {
    throw new Error('Invalid commission rate');
  }
  return rate;
}

export function calculateCommissionAmount(
  serviceAmount: number,
  ratePercent: unknown,
): number {
  if (!Number.isFinite(serviceAmount) || serviceAmount <= 0) {
    throw new Error('Invalid service amount');
  }
  const rate = normalizeCommissionRatePercent(ratePercent) / 100;
  return Math.round(serviceAmount * rate * 100) / 100;
}
