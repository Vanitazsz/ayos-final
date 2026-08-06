import { useEffect, useMemo, useState } from 'react';
import { Colors } from '@/constants/theme';
import {
  fetchWallet,
  fetchWalletTransactions,
  subscribeToTable,
  type WalletSummary,
  type WalletTransaction,
} from '@/services/api';
import { getMyWalletAccountId } from '@/services/wallet';

export type Period = 'week' | 'month' | 'all';
export type TxFilter = 'all' | 'credit' | 'debit';

const emptyWallet: WalletSummary = {
  available: '₱0.00',
  locked: '₱0.00',
  methods: [],
  payouts: [],
};

function normalizeWallet(value: unknown): WalletSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return emptyWallet;
  }

  const candidate = value as Partial<WalletSummary>;
  return {
    available: typeof candidate.available === 'string' ? candidate.available : emptyWallet.available,
    locked: typeof candidate.locked === 'string' ? candidate.locked : emptyWallet.locked,
    methods: Array.isArray(candidate.methods) ? candidate.methods : [],
    payouts: Array.isArray(candidate.payouts) ? candidate.payouts : [],
  };
}

export function useWalletData(period: Period, txFilter: TxFilter) {
  const [wallet, setWallet] = useState<WalletSummary>(emptyWallet);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [selectedMethod, setSelectedMethod] = useState('');

  const refresh = async () => {
    const [balance, transactions] = await Promise.all([
      fetchWallet(),
      fetchWalletTransactions(),
    ]);

    if (!balance.error) {
      const nextWallet = normalizeWallet(balance.data);
      setWallet(nextWallet);
      setSelectedMethod((current) =>
        current ||
        nextWallet.methods.find((method) => method.is_default)?.id ||
        nextWallet.methods[0]?.id ||
        '',
      );
    }
    if (!transactions.error && Array.isArray(transactions.data)) {
      setWalletTransactions(transactions.data);
    }
  };

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const load = async () => {
      await refresh();
    };

    const setupSubscription = async () => {
      const walletAccountId = await getMyWalletAccountId();
      if (!mounted || !walletAccountId) return;
      unsubscribe = subscribeToTable(
        'wallet_transactions',
        () => void load(),
        `wallet_account_id=eq.${walletAccountId}`,
        undefined,
        ['INSERT', 'UPDATE'],
      );
    };

    void load();
    void setupSubscription();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const walletPayoutMethods = useMemo(
    () =>
      (Array.isArray(wallet.methods) ? wallet.methods : []).map((method) => ({
        ...method,
        account: method.last_four ? `•••• ${method.last_four}` : method.method_type,
        color: Colors.info,
      })),
    [wallet.methods],
  );

  const walletBarData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map((day, index) => ({
      day,
      val: walletTransactions
        .filter((row) => row.credit && new Date(row.createdAt).getDay() === index)
        .reduce((sum, row) => sum + Number(row.amount.replace(/[^0-9.]/g, '')), 0),
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
    const gross = periodTransactions
      .filter((row) => row.credit)
      .reduce((sum, row) => sum + Number(row.amount.replace(/[^0-9.]/g, '')), 0);
    const deductions = periodTransactions
      .filter((row) => !row.credit)
      .reduce((sum, row) => sum + Number(row.amount.replace(/[^0-9.]/g, '')), 0);
    return {
      gross: `₱${gross.toLocaleString()}`,
      net: `₱${Math.max(0, gross - deductions).toLocaleString()}`,
      jobs: String(
        periodTransactions.filter((row) => row.label.toLowerCase().includes('earning')).length,
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


