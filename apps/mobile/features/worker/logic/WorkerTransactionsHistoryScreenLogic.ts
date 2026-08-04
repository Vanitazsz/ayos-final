export {
  fetchWalletTransactions,
  type WalletTransaction,
  type TransactionStatus,
} from '@/services/wallet';
import type { WalletTransaction } from '@/services/wallet';
export { transactionStatusKind } from '@/services/transactionStatusMeta';

export type TxFilter = 'all' | 'credit' | 'debit';

const MONTH_INDEX: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const parseTransactionDate = (value: string): Date => {
  const [m, day] = value.split(' ');
  return new Date(2026, MONTH_INDEX[m] || 0, parseInt(day));
};

export const filterWalletTransactions = (
  transactions: WalletTransaction[],
  criteria: {
    txFilter: TxFilter;
    searchQuery: string;
    fromDate: string;
    toDate: string;
  },
): WalletTransaction[] => {
  let result = [...transactions];

  if (criteria.txFilter === 'credit')
    result = result.filter((t) => t.credit);
  if (criteria.txFilter === 'debit')
    result = result.filter((t) => !t.credit);

  if (criteria.searchQuery.trim()) {
    const q = criteria.searchQuery.toLowerCase();
    result = result.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.sub.toLowerCase().includes(q) ||
        t.amount.toLowerCase().includes(q),
    );
  }

  if (criteria.fromDate.trim()) {
    result = result.filter((t) => {
      const txDate = new Date(t.date);
      const from = new Date(criteria.fromDate);
      return txDate >= from;
    });
  }

  if (criteria.toDate.trim()) {
    result = result.filter((t) => {
      const txDate = new Date(t.date);
      const to = new Date(criteria.toDate);
      return txDate <= to;
    });
  }

  result.sort(
    (a, b) =>
      parseTransactionDate(b.date).getTime() -
      parseTransactionDate(a.date).getTime(),
  );

  return result;
};

export const groupTransactionsByDate = (
  transactions: WalletTransaction[],
): Array<[string, WalletTransaction[]]> => {
  const groups: Record<string, WalletTransaction[]> = {};
  transactions.forEach((tx) => {
    if (!groups[tx.date]) groups[tx.date] = [];
    groups[tx.date].push(tx);
  });
  return Object.entries(groups);
};
