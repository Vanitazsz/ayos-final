export type TransactionStatusKind = 'success' | 'warning' | 'error';

export function transactionStatusKind(
  status: string | null | undefined,
): TransactionStatusKind {
  if (status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  return 'error';
}
