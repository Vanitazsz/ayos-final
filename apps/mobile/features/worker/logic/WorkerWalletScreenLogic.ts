export {
  fetchWallet,
  fetchWalletTransactions,
  requestPayout,
  type WalletSummary,
  type WalletTransaction,
  type TransactionStatus,
} from '@/services/wallet';
import type { WalletSummary, WalletTransaction } from '@/services/wallet';
export { subscribeToTable } from '@/services/realtime';
export { transactionStatusKind } from '@/services/transactionStatusMeta';
import { formatPesoMajor } from '@/utils/format';
export { formatPesoMajor } from '@/utils/format';

export const QUICK_AMOUNTS = ['5,000', '10,000', '18,450'];

export function quickAmountValue(display: string): string {
  return display.replace(',', '');
}

export const emptyWallet = (): WalletSummary => ({
  available: '₱0.00',
  locked: '₱0.00',
  methods: [],
  payouts: [],
});

export function normalizeWallet(value: unknown): WalletSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return emptyWallet();
  }

  const candidate = value as Partial<WalletSummary>;
  return {
    available:
      typeof candidate.available === 'string'
        ? candidate.available
        : emptyWallet().available,
    locked:
      typeof candidate.locked === 'string'
        ? candidate.locked
        : emptyWallet().locked,
    methods: Array.isArray(candidate.methods) ? candidate.methods : [],
    payouts: Array.isArray(candidate.payouts) ? candidate.payouts : [],
  };
}

export type WalletPeriod = 'week' | 'month' | 'all';
export type WalletTxFilter = 'all' | 'credit' | 'debit';

export const periodCutoff = (period: WalletPeriod): number =>
  period === 'week'
    ? Date.now() - 7 * 86400000
    : period === 'month'
      ? Date.now() - 30 * 86400000
      : 0;

export const transactionAmount = (row: {
  amount: string;
}): number => Number(row.amount.replace(/[^0-9.]/g, ''));

export const transactionsInPeriod = (
  transactions: WalletTransaction[],
  period: WalletPeriod,
): WalletTransaction[] => {
  const cutoff = periodCutoff(period);
  return transactions.filter(
    (row) => new Date(row.createdAt).getTime() >= cutoff,
  );
};

export const walletPeriodStats = (transactions: WalletTransaction[]) => {
  const gross = transactions
    .filter((row) => row.credit)
    .reduce((sum, row) => sum + transactionAmount(row), 0);
  const deductions = transactions
    .filter((row) => !row.credit)
    .reduce((sum, row) => sum + transactionAmount(row), 0);
  return {
    gross: formatPesoMajor(gross),
    net: formatPesoMajor(Math.max(0, gross - deductions)),
    jobs: String(
      transactions.filter((row) =>
        row.label.toLowerCase().includes('earning'),
      ).length,
    ),
    commission: formatPesoMajor(deductions),
  };
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const walletBarData = (transactions: WalletTransaction[]) =>
  WEEKDAY_LABELS.map((day, index) => ({
    day,
    val: transactions
      .filter(
        (row) => row.credit && new Date(row.createdAt).getDay() === index,
      )
      .reduce((sum, row) => sum + transactionAmount(row), 0),
  }));

export const barMax = (barData: Array<{ val: number }>): number =>
  Math.max(1, ...barData.map((row) => row.val));

export const filterWalletTransactions = (
  transactions: WalletTransaction[],
  filter: WalletTxFilter,
): WalletTransaction[] => {
  let filtered = transactions;
  if (filter === 'credit') filtered = filtered.filter((t) => t.credit);
  if (filter === 'debit') filtered = filtered.filter((t) => !t.credit);
  return filtered.slice(0, 3);
};

export const payoutMethodAccountLabel = (method: {
  last_four?: string | null;
  method_type: string;
}): string => (method.last_four ? `•••• ${method.last_four}` : method.method_type);
