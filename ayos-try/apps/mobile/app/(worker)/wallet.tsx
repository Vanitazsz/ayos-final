import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Dimensions,
  Alert,
  Keyboard,
} from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, Elevation, Layout, Typography, theme } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Badge } from '@/components/Badge';
import { Chip } from '@/components/Chip';
import { fetchWallet, fetchWalletTransactions, requestPayout, subscribeToTable, type WalletSummary, type WalletTransaction, type TransactionStatus } from '@/services/api';

type Period = 'week' | 'month' | 'all';
type TxFilter = 'all' | 'credit' | 'debit';

const { width: screenWidth } = Dimensions.get('window');
const statusIcon = (s: TransactionStatus) => {
  if (s === 'completed') return <CheckCircle size={12} color={Colors.verified} />;
  if (s === 'pending') return <Clock size={12} color={Colors.warning} />;
  return <AlertCircle size={12} color={Colors.error} />;
};

const statusColor = (s: TransactionStatus) => {
  if (s === 'completed') return Colors.verified;
  if (s === 'pending') return Colors.warning;
  return Colors.error;
};

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

export default function WalletScreen() {
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
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
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
        setSelectedMethod((current) =>
          current || nextWallet.methods.find((method) => method.is_default)?.id || nextWallet.methods[0]?.id || '',
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
  const walletPayoutMethods = (Array.isArray(wallet.methods) ? wallet.methods : []).map((method) => ({
    ...method,
    account: method.last_four ? `•••• ${method.last_four}` : method.method_type,
    color: Colors.info,
  }));
  const cutoff=period==='week'?Date.now()-7*86400000:period==='month'?Date.now()-30*86400000:0;const periodTransactions=walletTransactions.filter(row=>new Date(row.createdAt).getTime()>=cutoff);const gross=periodTransactions.filter(row=>row.credit).reduce((sum,row)=>sum+Number(row.amount.replace(/[^0-9.]/g,'')),0);const deductions=periodTransactions.filter(row=>!row.credit).reduce((sum,row)=>sum+Number(row.amount.replace(/[^0-9.]/g,'')),0);const stats={gross:`₱${gross.toLocaleString()}`,net:`₱${Math.max(0,gross-deductions).toLocaleString()}`,jobs:String(periodTransactions.filter(row=>row.label.toLowerCase().includes('earning')).length),commission:`₱${deductions.toLocaleString()}`};
  const walletBarData=useMemo(()=>{const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];return days.map((day,index)=>({day,val:walletTransactions.filter(row=>row.credit&&new Date(row.createdAt).getDay()===index).reduce((sum,row)=>sum+Number(row.amount.replace(/[^0-9.]/g,'')),0)}));},[walletTransactions]);const BAR_MAX=Math.max(1,...walletBarData.map(row=>row.val));

  const filteredTransactions = useMemo(() => {
    let filtered = walletTransactions;
    if (txFilter === 'credit') filtered = filtered.filter((t) => t.credit);
    if (txFilter === 'debit') filtered = filtered.filter((t) => !t.credit);
    return filtered.slice(0, 3);
  }, [txFilter, walletTransactions]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={theme.typography.h2}>Wallet</Text>
      </View>
      <View style={{ paddingHorizontal: theme.layout.screenPadding, flex: 1 }}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <AppText variant="caption" color={Colors.textTertiary}>Available Balance</AppText>
            <AppText variant="h1" weight="bold" color={Colors.textPrimary}>{wallet.available}</AppText>
            <View style={styles.pendingRow}>
              <Clock size={11} color={Colors.textTertiary} />
              <AppText variant="caption" color={Colors.textTertiary}>{wallet.locked} pending clearance</AppText>
            </View>
          </View>
          <View style={styles.balanceActions}>
            <AppButton
              label="Top-Up"
              variant="outline"
              size="sm"
              leftIcon={<ArrowUpFromLine size={14} color={Colors.cta} />}
              onPress={() => Alert.alert('Unavailable','Wallet top-up is unavailable until a payment provider is configured.')}
              style={styles.balanceBtn}
            />
            <AppButton
              label="Payout"
              variant="secondary"
              size="sm"
              leftIcon={<ArrowDownToLine size={14} color={Colors.cta} />}
              onPress={() => setShowPayout(true)}
              style={styles.balanceBtn}
            />
          </View>
        </View>

        {/* Bar Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <AppText variant="body" weight="bold">Daily Earnings — This Week</AppText>
            <Badge label={`Peak: ₱${BAR_MAX.toLocaleString()}`} variant="info" size="sm" />
          </View>
          <View style={styles.barChart}>
            {walletBarData.map((d, i) => (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${(d.val / BAR_MAX) * 100}%`,
                        backgroundColor: d.val === BAR_MAX ? Colors.verified : Colors.info,
                      },
                    ]}
                  />
                </View>
                <AppText variant="caption" color={Colors.textTertiary}>{d.day}</AppText>
              </View>
            ))}
          </View>
        </View>

        {/* Period Toggle */}
        <View style={styles.periodToggle}>
          {(['week', 'month', 'all'] as Period[]).map((p) => (
            <Chip
              key={p}
              label={p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
              selected={period === p}
              onPress={() => setPeriod(p)}
              size="sm"
            />
          ))}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Gross Earnings', val: stats.gross, color: Colors.info, icon: <TrendingUp size={16} color={Colors.info} /> },
            { label: 'Net Earnings', val: stats.net, color: Colors.verified, icon: <DollarSign size={16} color={Colors.verified} /> },
            { label: 'Jobs Completed', val: stats.jobs, color: Colors.warning, icon: <CheckCircle size={16} color={Colors.warning} /> },
            { label: 'Commission Paid', val: stats.commission, color: Colors.textTertiary, icon: <TrendingDown size={16} color={Colors.textTertiary} /> },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${s.color}15` }]}>
                {s.icon}
              </View>
              <AppText variant="h4" weight="bold" color={s.color}>{s.val}</AppText>
              <AppText variant="caption" color={Colors.textTertiary}>{s.label}</AppText>
            </View>
          ))}
        </View>

        {/* Transactions */}
        <View style={styles.txSection}>
          <View style={styles.txHeader}>
            <AppText variant="body" weight="bold">Transactions</AppText>
            <View style={styles.txFilters}>
              {(['all', 'credit', 'debit'] as TxFilter[]).map((f) => (
                <Chip
                  key={f}
                  label={f === 'all' ? 'All' : f === 'credit' ? 'Income' : 'Deductions'}
                  selected={txFilter === f}
                  onPress={() => setTxFilter(f)}
                  size="sm"
                />
              ))}
            </View>
          </View>
          <View style={styles.txList}>
            {filteredTransactions.map((tx) => (
              <View key={tx.id + tx.date} style={styles.txRow}>
                <View
                  style={[
                    styles.txIcon,
                    {
                      backgroundColor: tx.credit
                        ? Colors.successBg
                        : tx.label.includes('Commission')
                          ? Colors.errorBg
                          : Colors.infoBg,
                    },
                  ]}
                >
                  {tx.credit ? (
                    <TrendingUp size={14} color={Colors.verified} />
                  ) : tx.label.includes('Commission') ? (
                    <TrendingDown size={14} color={Colors.error} />
                  ) : (
                    <ArrowDownToLine size={14} color={Colors.info} />
                  )}
                </View>
                <View style={styles.txBody}>
                  <View style={styles.txTop}>
                    <AppText variant="bodySm" weight="bold" numberOfLines={1}>{tx.label}</AppText>
                    <AppText
                      variant="bodySm"
                      weight="bold"
                      color={tx.credit ? Colors.verified : tx.label.includes('Payout') ? Colors.info : Colors.error}
                    >
                      {tx.amount}
                    </AppText>
                  </View>
                  <View style={styles.txBottom}>
                    <AppText variant="caption" color={Colors.textTertiary}>{tx.sub} · {tx.date}</AppText>
                    <View style={styles.txStatus}>
                      {statusIcon(tx.status)}
                      <AppText variant="caption" weight="bold" color={statusColor(tx.status)}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </AppText>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* See All */}
          <Pressable
            style={styles.seeAllBtn}
            onPress={() => router.push('/(worker)/transactions-history')}
          >
            <AppText variant="bodySm" weight="bold" color={Colors.info}>See All Transactions</AppText>
            <ChevronRight size={16} color={Colors.info} />
          </Pressable>
        </View>
      </ScrollView>
      </View>

      {/* Payout Sheet */}
      <Modal visible={showPayout} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => { Keyboard.dismiss(); setShowPayout(false); }}>
          <Pressable style={styles.sheet} onPress={() => Keyboard.dismiss()}>
            <View style={styles.sheetHandle} />
            <AppText variant="h4" weight="bold">Request Payout</AppText>
            <AppText variant="caption" color={Colors.textSecondary}>
              Available balance: <AppText weight="bold" color={Colors.textPrimary}>{wallet.available}</AppText>
            </AppText>

            <View style={styles.amountWrap}>
              <AppText variant="h3" weight="bold" color={Colors.textPrimary}>₱</AppText>
              <TextInput
                style={styles.amountInput}
                value={payoutAmount}
                onChangeText={setPayoutAmount}
                keyboardType="number-pad"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.quickAmounts}>
              {['5,000', '10,000', '18,450'].map((a) => (
                <Pressable
                  key={a}
                  style={styles.quickAmt}
                  onPress={() => setPayoutAmount(a.replace(',', ''))}
                >
                  <AppText variant="caption" weight="bold" color={Colors.info}>₱{a}</AppText>
                </Pressable>
              ))}
            </View>

            <AppText variant="caption" weight="bold" color={Colors.textTertiary} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Send to
            </AppText>
            <View style={styles.methodList}>
              {walletPayoutMethods.map((m) => (
                <Pressable
                  key={m.id}
                  style={[styles.methodRow, selectedMethod === m.id && styles.methodRowActive]}
                  onPress={() => setSelectedMethod(m.id)}
                >
                  <View style={[styles.methodDot, { backgroundColor: m.color }]} />
                  <View style={styles.methodInfo}>
                    <AppText variant="bodySm" weight="bold">{m.label}</AppText>
                    <AppText variant="caption" color={Colors.textTertiary}>{m.account}</AppText>
                  </View>
                  {selectedMethod === m.id && <CheckCircle size={16} color={Colors.info} />}
                </Pressable>
              ))}
            </View>

            <View style={styles.payoutNote}>
              <AlertCircle size={12} color={Colors.textTertiary} />
              <AppText variant="caption" color={Colors.textTertiary}>Payouts are processed within 1–2 business days.</AppText>
            </View>

            <View style={styles.sheetActions}>
              <AppButton label="Cancel" variant="outline" onPress={() => setShowPayout(false)} style={{ flex: 1 }} />
              <AppButton
                label="Confirm Payout"
                variant="primary"
                leftIcon={<ArrowDownToLine size={14} color={Colors.white} />}
                onPress={() => {const amount=Number(payoutAmount);if(!selectedMethod||!Number.isFinite(amount)||amount<=0){Alert.alert('Invalid payout','Select a payout method and enter a valid amount.');return;}void requestPayout(selectedMethod,Math.round(amount*100)).then(()=>{setShowPayout(false);setShowPayoutSuccess(true)}).catch(error=>Alert.alert('Payout not requested',error.message));}}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Top-Up Sheet */}
      <Modal visible={showTopUp} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => { Keyboard.dismiss(); setShowTopUp(false); }}>
          <Pressable style={styles.sheet} onPress={() => Keyboard.dismiss()}>
            <View style={styles.sheetHandle} />
            <AppText variant="h4" weight="bold">Top-Up Wallet</AppText>
            <AppText variant="caption" color={Colors.textSecondary}>
              Available balance: <AppText weight="bold" color={Colors.textPrimary}>{wallet.available}</AppText>
            </AppText>

            <View style={styles.amountWrap}>
              <AppText variant="h3" weight="bold" color={Colors.textPrimary}>₱</AppText>
              <TextInput
                style={styles.amountInput}
                value={topUpAmount}
                onChangeText={setTopUpAmount}
                keyboardType="number-pad"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.quickAmounts}>
              {['5,000', '10,000', '18,450'].map((a) => (
                <Pressable
                  key={a}
                  style={styles.quickAmt}
                  onPress={() => setTopUpAmount(a.replace(',', ''))}
                >
                  <AppText variant="caption" weight="bold" color={Colors.info}>₱{a}</AppText>
                </Pressable>
              ))}
            </View>

            <AppText variant="caption" weight="bold" color={Colors.textTertiary} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Pay with
            </AppText>
            <View style={styles.methodList}>
              {walletPayoutMethods.map((m) => (
                <Pressable
                  key={m.id}
                  style={[styles.methodRow, selectedTopUpMethod === m.id && styles.methodRowActive]}
                  onPress={() => setSelectedTopUpMethod(m.id)}
                >
                  <View style={[styles.methodDot, { backgroundColor: m.color }]} />
                  <View style={styles.methodInfo}>
                    <AppText variant="bodySm" weight="bold">{m.label}</AppText>
                    <AppText variant="caption" color={Colors.textTertiary}>{m.account}</AppText>
                  </View>
                  {selectedTopUpMethod === m.id && <CheckCircle size={16} color={Colors.info} />}
                </Pressable>
              ))}
            </View>

            <View style={styles.payoutNote}>
              <AlertCircle size={12} color={Colors.textTertiary} />
              <AppText variant="caption" color={Colors.textTertiary}>Top-ups are processed instantly.</AppText>
            </View>

            <View style={styles.sheetActions}>
              <AppButton label="Cancel" variant="outline" onPress={() => setShowTopUp(false)} style={{ flex: 1 }} />
              <AppButton
                label="Confirm Top-Up"
                variant="primary"
                leftIcon={<ArrowUpFromLine size={14} color={Colors.white} />}
                onPress={() => Alert.alert('Unavailable','Wallet top-up is unavailable until a payment provider is configured.')}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Payout Success */}
      <Modal visible={showPayoutSuccess} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <CheckCircle size={48} color={Colors.verified} />
            </View>
            <AppText variant="h3" weight="bold" align="center">Payout Requested</AppText>
            <AppText variant="body" color={Colors.textSecondary} align="center">
              Your payout of <AppText weight="bold" color={Colors.textPrimary}>₱{Number(payoutAmount).toLocaleString()}</AppText> to{' '}
              <AppText weight="bold" color={Colors.textPrimary}>{walletPayoutMethods.find((m) => m.id === selectedMethod)?.label}</AppText>{' '}
              is being processed. Funds will arrive within 1–2 business days.
            </AppText>
            <AppButton label="Done" variant="primary" fullWidth onPress={() => setShowPayoutSuccess(false)} />
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingVertical: theme.spacing.md, paddingHorizontal: theme.layout.screenPadding * 2 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: theme.layout.screenPadding, paddingBottom: theme.spacing.xxl },

  // Balance card
  balanceCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    padding: Spacing['5'], gap: Spacing['4'], ...Elevation.sm,
    marginBottom: theme.spacing.xl,
  },
  balanceTop: { gap: Spacing['1'] },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['1'], marginTop: Spacing['1'] },
  balanceActions: { flexDirection: 'row', gap: Spacing['3'] },
  balanceBtn: { flex: 1 },

  // Period toggle
  periodToggle: { flexDirection: 'row', justifyContent: 'center', gap: Spacing['2'], marginBottom: theme.spacing.md },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['3'], marginBottom: theme.spacing.xl },
  statCard: {
    width: (screenWidth - Layout.screenPadding * 4 - Spacing['3']) / 2,
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    padding: Spacing['4'], gap: Spacing['2'], ...Elevation.sm,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },

  // Bar chart
  chartCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    padding: Spacing['4'], ...Elevation.sm,
    marginBottom: theme.spacing.xl,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing['4'] },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing['2'], height: 100 },
  barCol: { flex: 1, alignItems: 'center', gap: Spacing['1'], height: '100%' },
  barTrack: { flex: 1, width: '100%', backgroundColor: Colors.borderLight, borderRadius: Radius.xs, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: Radius.xs },

  // Transactions
  txSection: { gap: Spacing['3'], marginBottom: theme.spacing.xl },
  txHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  txFilters: { flexDirection: 'row', justifyContent: 'center', gap: Spacing['2'] },
  txList: { gap: Spacing['2'] },
  txRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing['3'],
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    padding: Spacing['3'], ...Elevation.sm,
  },
  txIcon: {
    width: 36, height: 36, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  txBody: { flex: 1, gap: 2 },
  txTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txStatus: { flexDirection: 'row', alignItems: 'center', gap: 3 },

  // See All
  seeAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing['2'], paddingVertical: Spacing['3'],
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.borderLight,
  },

  // Performance card
  perfCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    padding: Spacing['4'], ...Elevation.sm,
    marginBottom: theme.spacing.xl,
  },
  perfHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], marginBottom: Spacing['4'] },
  perfAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.info, alignItems: 'center', justifyContent: 'center',
  },
  perfInfo: { flex: 1, gap: 2 },
  perfStats: { gap: Spacing['3'] },
  perfRow: { gap: Spacing['1'] },
  perfRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  perfTrack: { height: 6, backgroundColor: Colors.borderLight, borderRadius: Radius.full, overflow: 'hidden' },
  perfFill: { height: '100%', borderRadius: Radius.full },

  // Payout sheet
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    padding: Spacing['5'], gap: Spacing['3'],
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing['2'] },
  amountWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.xl, padding: Spacing['4'], gap: Spacing['2'],
  },
  amountInput: {
    flex: 1, fontSize: Typography['5xl'], fontWeight: '800', color: Colors.textPrimary,
    paddingVertical: 0,
  },
  quickAmounts: { flexDirection: 'row', gap: Spacing['2'] },
  quickAmt: {
    flex: 1, paddingVertical: Spacing['2'], borderRadius: Radius.md,
    backgroundColor: Colors.primarySurface, alignItems: 'center',
  },
  methodList: { gap: Spacing['2'] },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing['3'],
    backgroundColor: Colors.surfaceLight, borderRadius: Radius.xl,
    padding: Spacing['3'], borderWidth: 2, borderColor: 'transparent',
  },
  methodRowActive: { borderColor: Colors.info, backgroundColor: Colors.primarySurface },
  methodDot: { width: 12, height: 12, borderRadius: 6 },
  methodInfo: { flex: 1 },
  payoutNote: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  sheetActions: { flexDirection: 'row', gap: Spacing['3'], marginTop: Spacing['2'] },

  // Success popups
  successOverlay: {
    flex: 1, backgroundColor: Colors.overlay,
    justifyContent: 'center', alignItems: 'center', padding: Layout.screenPadding,
  },
  successCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xxl,
    padding: Spacing['6'], width: '100%', maxWidth: 340,
    alignItems: 'center', gap: Spacing['4'], ...Elevation.lg,
  },
  successIcon: {
    width: 80, height: 80, borderRadius: Radius.full,
    backgroundColor: Colors.verifiedBg, alignItems: 'center', justifyContent: 'center',
  },
});
