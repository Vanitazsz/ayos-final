export {
  fetchWallet,
  fetchWalletTransactions,
  requestPayout,
  type WalletSummary,
  type WalletTransaction,
  type TransactionStatus,
} from '@/services/wallet';
export { subscribeToTable } from '@/services/realtime';
export { transactionStatusKind } from '@/services/transactionStatusMeta';

export const QUICK_AMOUNTS = ['5,000', '10,000', '18,450'];

export function quickAmountValue(display: string): string {
  return display.replace(',', '');
}
