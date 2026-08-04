type PaymentAmount = {
  status?: string | null;
  service_amount?: number | string | null;
};

function validAmount(value: unknown) {
  if (value == null || value === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount >= 999_999_999) {
    return null;
  }
  return amount;
}

export function resolveWorkerEarningsAmount(
  agreedServiceAmount: unknown,
  payment?: PaymentAmount | null,
) {
  const agreedAmount = validAmount(agreedServiceAmount);
  if (agreedAmount != null) return agreedAmount;

  return validAmount(payment?.service_amount);
}
