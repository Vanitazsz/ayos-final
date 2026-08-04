type PaymentAmount = {
  status?: string | null;
  service_amount?: number | string | null;
};

function validAmount(value: unknown) {
  if (value == null) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function resolveWorkerEarningsAmount(
  agreedServiceAmount: unknown,
  payment?: PaymentAmount | null,
) {
  const paymentAmount = validAmount(payment?.service_amount);

  return paymentAmount ?? validAmount(agreedServiceAmount);
}
