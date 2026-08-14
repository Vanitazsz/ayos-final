import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/theme';
import {
  fetchWallet,
  fetchWalletTransactions,
  subscribeToTable,
  type WalletSummary,
  type WalletTransaction,
} from '@/services/api';
import { fetchMyWalletTopups } from '@/services/walletTopups';
import {
  queryKeys,
  QUERY_STALE_TIMES,
  toQueryData,
} from '@/services/queryUtils';
import { useAuthStore } from '@/store/useAuthStore';

export type Period = 'week' | 'month' | 'all';
export type TxFilter = 'all' | 'credit' | 'debit';

const emptyWallet: WalletSummary = {
  available: '₱0.00',
  locked: '₱0.00',
  completedJobs: 0,
  methods: [],
  payouts: [],
};

function normalizeWallet(value: unknown): WalletSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return emptyWallet;
  }

  const candidate = value as Partial<WalletSummary>;
  return {
    available:
      typeof candidate.available === 'string'
        ? candidate.available
        : emptyWallet.available,
    locked:
      typeof candidate.locked === 'string'
        ? candidate.locked
        : emptyWallet.locked,
    completedJobs:
      typeof candidate.completedJobs === 'number' ? candidate.completedJobs : 0,
    methods: Array.isArray(candidate.methods) ? candidate.methods : [],
    payouts: Array.isArray(candidate.payouts) ? candidate.payouts : [],
  };
}

export function useWalletData(period: Period, txFilter: TxFilter) {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState('');

  const walletQuery = useQuery({
    queryKey: queryKeys.wallet(userId ?? 'anonymous'),
    queryFn: async () => toQueryData(await fetchWallet()),
    staleTime: QUERY_STALE_TIMES.list,
    enabled: Boolean(userId),
  });
  const transactionsQuery = useQuery({
    queryKey: queryKeys.walletTransactions(userId ?? 'anonymous'),
    queryFn: async () => toQueryData(await fetchWalletTransactions()),
    staleTime: QUERY_STALE_TIMES.list,
    enabled: Boolean(userId),
  });
  const topupsQuery = useQuery({
    queryKey: queryKeys.walletTopups(userId ?? 'anonymous'),
    queryFn: () => fetchMyWalletTopups(),
    staleTime: QUERY_STALE_TIMES.list,
    enabled: Boolean(userId),
  });

  const wallet = walletQuery.data ?? emptyWallet;
  const walletTransactions = transactionsQuery.data ?? [];
  const manualTopups = topupsQuery.data ?? [];

  useEffect(() => {
    setSelectedMethod(
      (current) =>
        current ||
        wallet.methods.find((method) => method.is_default)?.id ||
        wallet.methods[0]?.id ||
        '',
    );
  }, [wallet.methods]);

  const hasPendingTopup = manualTopups.some(
    (topup) =>
      topup.status === 'PENDING' ||
      topup.status === 'PROCESSING' ||
      topup.status === 'REQUIRES_ACTION',
  );

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.wallet(userId ?? 'anonymous'),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.walletTransactions(userId ?? 'anonymous'),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.walletTopups(userId ?? 'anonymous'),
    });
  }, [queryClient, userId]);

  const invalidateWallet = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.wallet(userId ?? 'anonymous'),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.walletTransactions(userId ?? 'anonymous'),
    });
  }, [queryClient, userId]);

  useEffect(() => {
    if (!userId) return;
    return subscribeToTable(
      'wallet_transactions',
      invalidateWallet,
      `wallet_account_id=eq.${userId}`,
      undefined,
      ['INSERT', 'UPDATE'],
    );
  }, [userId, invalidateWallet]);

  useEffect(() => {
    if (!hasPendingTopup) return;
    const interval = setInterval(() => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.walletTopups(userId ?? 'anonymous'),
      });
    }, 15_000);
    return () => clearInterval(interval);
  }, [hasPendingTopup, queryClient, userId]);

  const walletPayoutMethods = useMemo(
    () =>
      (Array.isArray(wallet.methods) ? wallet.methods : []).map((method) => ({
        ...method,
        account: method.last_four
          ? `•••• ${method.last_four}`
          : method.method_type,
        color: Colors.info,
      })),
    [wallet.methods],
  );

  const walletBarData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map((day, index) => ({
      day,
      val: walletTransactions
        .filter(
          (row) => row.credit && new Date(row.createdAt).getDay() === index,
        )
        .reduce(
          (sum, row) => sum + Number(row.amount.replace(/[^0-9.]/g, '')),
          0,
        ),
    }));
  }, [walletTransactions]);
  const barMax = Math.max(1, ...walletBarData.map((row) => row.val));

  const stats = useMemo(() => {
    const cutoff =
      period === 'week'
        ? Date.now() - 7 * 86400000
        : period === 'month'
          ? Date.now() - 30 * 86400000
          : 0;
    const periodTransactions = walletTransactions.filter(
      (row) => new Date(row.createdAt).getTime() >= cutoff,
    );
    const rawGross = periodTransactions
      .filter((row) => row.credit)
      .reduce(
        (sum, row) => sum + Number(row.amount.replace(/[^0-9.]/g, '')),
        0,
      );
    const gross = rawGross < 1000000000 ? rawGross : 0;
    const deductions = periodTransactions
      .filter((row) => !row.credit)
      .reduce(
        (sum, row) => sum + Number(row.amount.replace(/[^0-9.]/g, '')),
        0,
      );
    return {
      gross: `₱${gross.toLocaleString()}`,
      net: `₱${Math.max(0, gross - deductions).toLocaleString()}`,
      jobs: String(
        periodTransactions.filter((row) =>
          row.label.toLowerCase().includes('earning'),
        ).length,
      ),
      commission: `₱${deductions.toLocaleString()}`,
    };
  }, [period, walletTransactions]);

  const filteredTransactions = useMemo(() => {
    let filtered = walletTransactions;
    if (txFilter === 'credit') filtered = filtered.filter((t) => t.credit);
    if (txFilter === 'debit') filtered = filtered.filter((t) => !t.credit);
    return filtered.slice(0, 3);
  }, [txFilter, walletTransactions]);

  return {
    wallet,
    walletTransactions,
    manualTopups,
    walletPayoutMethods,
    stats,
    walletBarData,
    barMax,
    filteredTransactions,
    selectedMethod,
    setSelectedMethod,
    refresh,
  };
}
