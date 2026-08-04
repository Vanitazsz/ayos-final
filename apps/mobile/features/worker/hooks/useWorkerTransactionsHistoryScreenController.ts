import {
  fetchWalletTransactions,
  filterWalletTransactions,
  groupTransactionsByDate,
  type TxFilter,
  type WalletTransaction,
} from '../logic/WorkerTransactionsHistoryScreenLogic';
import { useState, useMemo, useEffect } from 'react';
import { router } from 'expo-router';
export function useWorkerTransactionsHistoryScreenController() {
  const [searchQuery, setSearchQuery] = useState('');
  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  useEffect(() => {
    let active = true;
    void fetchWalletTransactions().then((result) => {
      if (active) setTransactions(result.data);
    });
    return () => {
      active = false;
    };
  }, []);
  const filteredTransactions = useMemo(
    () =>
      filterWalletTransactions(transactions, {
        txFilter,
        searchQuery,
        fromDate,
        toDate,
      }),
    [txFilter, searchQuery, fromDate, toDate, transactions],
  );
  const groupedTransactions = useMemo(
    () => groupTransactionsByDate(filteredTransactions),
    [filteredTransactions],
  );
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
