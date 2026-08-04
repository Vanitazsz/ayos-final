import {
  fetchWallet,
  fetchWalletTransactions,
  requestPayout,
  subscribeToTable,
  type WalletSummary,
  type WalletTransaction,
} from '../logic/WorkerWalletScreenLogic';
import { useState, useMemo, useEffect } from 'react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { Colors } from '@/constants/theme';
type Period = 'week' | 'month' | 'all';

type TxFilter = 'all' | 'credit' | 'debit';

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
    available:
      typeof candidate.available === 'string'
        ? candidate.available
        : emptyWallet.available,
    locked:
      typeof candidate.locked === 'string'
        ? candidate.locked
        : emptyWallet.locked,
    methods: Array.isArray(candidate.methods) ? candidate.methods : [],
    payouts: Array.isArray(candidate.payouts) ? candidate.payouts : [],
  };
}
export function useWorkerWalletScreenController() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('week');
  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [showPayout, setShowPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('5000');
  const [selectedTopUpMethod, setSelectedTopUpMethod] = useState('gcash');
  const [showPayoutSuccess, setShowPayoutSuccess] = useState(false);
  const [wallet, setWallet] = useState<WalletSummary>(emptyWallet);
  const [walletTransactions, setWalletTransactions] = useState<
    WalletTransaction[]
  >([]);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [balance, transactions] = await Promise.all([
        fetchWallet(),
        fetchWalletTransactions(),
      ]);
      if (!mounted) return;

      if (!balance.error) {
        const nextWallet = normalizeWallet(balance.data);
        setWallet(nextWallet);
        setSelectedMethod(
          (current) =>
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
    void load();
    const unsubscribe = subscribeToTable('wallet_transactions', load);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  const walletPayoutMethods = (
    Array.isArray(wallet.methods) ? wallet.methods : []
  ).map((method) => ({
    ...method,
    account: method.last_four ? `•••• ${method.last_four}` : method.method_type,
    color: Colors.info,
  }));
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
  const stats = {
    gross: `₱${gross.toLocaleString()}`,
    net: `₱${Math.max(0, gross - deductions).toLocaleString()}`,
    jobs: String(
      periodTransactions.filter((row) =>
        row.label.toLowerCase().includes('earning'),
      ).length,
    ),
    commission: `₱${deductions.toLocaleString()}`,
  };
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
  const BAR_MAX = Math.max(1, ...walletBarData.map((row) => row.val));
  const filteredTransactions = useMemo(() => {
    let filtered = walletTransactions;
    if (txFilter === 'credit') filtered = filtered.filter((t) => t.credit);
    if (txFilter === 'debit') filtered = filtered.filter((t) => !t.credit);
    return filtered.slice(0, 3);
  }, [txFilter, walletTransactions]);
  const handleRequestPayout = () => {
    const amount = Number(payoutAmount);
    if (!selectedMethod || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert(
        'Invalid payout',
        'Select a payout method and enter a valid amount.',
      );
      return;
    }
    void requestPayout(selectedMethod, Math.round(amount * 100))
      .then(() => {
        setShowPayout(false);
        setShowPayoutSuccess(true);
      })
      .catch((error) => Alert.alert('Payout not requested', error.message));
  };
  return {
    insets,
    period,
    setPeriod,
    txFilter,
    setTxFilter,
    showPayout,
    setShowPayout,
    payoutAmount,
    setPayoutAmount,
    selectedMethod,
    setSelectedMethod,
    showTopUp,
    setShowTopUp,
    topUpAmount,
    setTopUpAmount,
    selectedTopUpMethod,
    setSelectedTopUpMethod,
    showPayoutSuccess,
    setShowPayoutSuccess,
    wallet,
    walletPayoutMethods,
    gross,
    stats,
    walletBarData,
    BAR_MAX,
    filteredTransactions,
    handleRequestPayout,
    router,
  };
}
