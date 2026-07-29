type PaymentAmount = {
  status?: string | null;
  service_amount?: number | string | null;
};

function validAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function resolveWorkerEarningsAmount(
  agreedServiceAmount: unknown,
  payment?: PaymentAmount | null,
) {
  const confirmedAmount =
    payment?.status === 'SUCCESSFUL'
      ? validAmount(payment.service_amount)
      : null;

  return confirmedAmount ?? validAmount(agreedServiceAmount);
}
