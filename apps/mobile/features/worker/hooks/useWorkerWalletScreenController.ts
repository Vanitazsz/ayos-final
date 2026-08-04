import {
  fetchWallet,
  fetchWalletTransactions,
  requestPayout,
  subscribeToTable,
  type WalletSummary,
  type WalletTransaction,
  emptyWallet,
  normalizeWallet,
  transactionsInPeriod,
  walletPeriodStats,
  walletBarData,
  barMax,
  filterWalletTransactions,
  payoutMethodAccountLabel,
  type WalletPeriod,
  type WalletTxFilter,
} from '../logic/WorkerWalletScreenLogic';
import { useState, useMemo, useEffect } from 'react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { Colors } from '@/constants/theme';
export function useWorkerWalletScreenController() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<WalletPeriod>('week');
  const [txFilter, setTxFilter] = useState<WalletTxFilter>('all');
  const [showPayout, setShowPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('5000');
  const [selectedTopUpMethod, setSelectedTopUpMethod] = useState('gcash');
  const [showPayoutSuccess, setShowPayoutSuccess] = useState(false);
  const [wallet, setWallet] = useState<WalletSummary>(() => emptyWallet());
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
    account: payoutMethodAccountLabel(method),
    color: Colors.info,
  }));
  const periodTransactions = transactionsInPeriod(walletTransactions, period);
  const stats = walletPeriodStats(periodTransactions);
  const walletBar = useMemo(
    () => walletBarData(walletTransactions),
    [walletTransactions],
  );
  const BAR_MAX = barMax(walletBar);
  const filteredTransactions = useMemo(
    () => filterWalletTransactions(walletTransactions, txFilter),
    [txFilter, walletTransactions],
  );
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
    stats,
    walletBar,
    BAR_MAX,
    filteredTransactions,
    handleRequestPayout,
    router,
  };
}
