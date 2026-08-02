import {
  fetchWalletTransactions,
  type WalletTransaction,
} from '../logic/WorkerTransactionsHistoryScreenLogic';
import { useState, useMemo, useEffect } from 'react';
import { router } from 'expo-router';
type TxFilter = 'all' | 'credit' | 'debit';
export function useWorkerTransactionsHistoryScreenController() {
  const [searchQuery, setSearchQuery] = useState('');
  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  useEffect(() => {
    void fetchWalletTransactions().then((result) =>
      setTransactions(result.data),
    );
  }, []);
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    if (txFilter === 'credit') result = result.filter((t) => t.credit);
    if (txFilter === 'debit') result = result.filter((t) => !t.credit);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          t.sub.toLowerCase().includes(q) ||
          t.amount.toLowerCase().includes(q),
      );
    }

    if (fromDate.trim()) {
      result = result.filter((t) => {
        const txDate = new Date(t.date);
        const from = new Date(fromDate);
        return txDate >= from;
      });
    }

    if (toDate.trim()) {
      result = result.filter((t) => {
        const txDate = new Date(t.date);
        const to = new Date(toDate);
        return txDate <= to;
      });
    }

    result.sort((a, b) => {
      const months: Record<string, number> = {
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
      const parseDate = (d: string) => {
        const [m, day] = d.split(' ');
        return new Date(2026, months[m] || 0, parseInt(day));
      };
      return parseDate(b.date).getTime() - parseDate(a.date).getTime();
    });

    return result;
  }, [searchQuery, txFilter, fromDate, toDate, transactions]);
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, WalletTransaction[]> = {};
    filteredTransactions.forEach((tx) => {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    });
    return Object.entries(groups);
  }, [filteredTransactions]);
  return {
    searchQuery,
    setSearchQuery,
    txFilter,
    setTxFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    groupedTransactions,
    router,
  };
}
