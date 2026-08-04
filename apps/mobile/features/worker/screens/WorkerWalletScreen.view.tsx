import { styles } from './WorkerWalletScreen.styles';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
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
import { Colors, theme } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Badge } from '@/components/Badge';
import { Chip } from '@/components/Chip';
import type { TransactionStatus } from '../logic/WorkerWalletScreenLogic';
import { transactionStatusKind } from '../logic/WorkerWalletScreenLogic';
import { QUICK_AMOUNTS, quickAmountValue } from '../logic/WorkerWalletScreenLogic';
import type { useWorkerWalletScreenController } from '../hooks/useWorkerWalletScreenController';
import { capitalizeFirst, formatWholeNumber } from '@/utils/format';
type Period = 'week' | 'month' | 'all';

type TxFilter = 'all' | 'credit' | 'debit';

const statusIcon = (s: TransactionStatus) => {
  const kind = transactionStatusKind(s);
  if (kind === 'success')
    return <CheckCircle size={12} color={Colors.verified} />;
  if (kind === 'warning') return <Clock size={12} color={Colors.warning} />;
  return <AlertCircle size={12} color={Colors.error} />;
};

const statusColor = (s: TransactionStatus) => {
  const kind = transactionStatusKind(s);
  if (kind === 'success') return Colors.verified;
  if (kind === 'warning') return Colors.warning;
  return Colors.error;
};
export function WalletView({
  model,
}: {
  model: ReturnType<typeof useWorkerWalletScreenController>;
}) {
  const {
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
  } = model;
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
              <AppText variant="caption" color={Colors.textTertiary}>
                Available Balance
              </AppText>
              <AppText variant="h1" weight="bold" color={Colors.textPrimary}>
                {wallet.available}
              </AppText>
              <View style={styles.pendingRow}>
                <Clock size={11} color={Colors.textTertiary} />
                <AppText variant="caption" color={Colors.textTertiary}>
                  {wallet.locked} pending clearance
                </AppText>
              </View>
            </View>
            <View style={styles.balanceActions}>
              <AppButton
                label="Top-Up"
                variant="outline"
                size="sm"
                leftIcon={<ArrowUpFromLine size={14} color={Colors.cta} />}
                onPress={() =>
                  Alert.alert(
                    'Unavailable',
                    'Wallet top-up is unavailable until a payment provider is configured.',
                  )
                }
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
              <AppText variant="body" weight="bold">
                Daily Earnings — This Week
              </AppText>
              <Badge
                label={`Peak: ₱${formatWholeNumber(BAR_MAX)}`}
                variant="info"
                size="sm"
              />
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
                          backgroundColor:
                            d.val === BAR_MAX ? Colors.verified : Colors.info,
                        },
                      ]}
                    />
                  </View>
                  <AppText variant="caption" color={Colors.textTertiary}>
                    {d.day}
                  </AppText>
                </View>
              ))}
            </View>
          </View>

          {/* Period Toggle */}
          <View style={styles.periodToggle}>
            {(['week', 'month', 'all'] as Period[]).map((p) => (
              <Chip
                key={p}
                label={
                  p === 'week'
                    ? 'This Week'
                    : p === 'month'
                      ? 'This Month'
                      : 'All Time'
                }
                selected={period === p}
                onPress={() => setPeriod(p)}
                size="sm"
              />
            ))}
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {[
              {
                label: 'Gross Earnings',
                val: stats.gross,
                color: Colors.info,
                icon: <TrendingUp size={16} color={Colors.info} />,
              },
              {
                label: 'Net Earnings',
                val: stats.net,
                color: Colors.verified,
                icon: <DollarSign size={16} color={Colors.verified} />,
              },
              {
                label: 'Jobs Completed',
                val: stats.jobs,
                color: Colors.warning,
                icon: <CheckCircle size={16} color={Colors.warning} />,
              },
              {
                label: 'Commission Paid',
                val: stats.commission,
                color: Colors.textTertiary,
                icon: <TrendingDown size={16} color={Colors.textTertiary} />,
              },
            ].map((s) => (
              <View key={s.label} style={styles.statCard}>
                <View
                  style={[styles.statIcon, { backgroundColor: `${s.color}15` }]}
                >
                  {s.icon}
                </View>
                <AppText variant="h4" weight="bold" color={s.color}>
                  {s.val}
                </AppText>
                <AppText variant="caption" color={Colors.textTertiary}>
                  {s.label}
                </AppText>
              </View>
            ))}
          </View>

          {/* Transactions */}
          <View style={styles.txSection}>
            <View style={styles.txHeader}>
              <AppText variant="body" weight="bold">
                Transactions
              </AppText>
              <View style={styles.txFilters}>
                {(['all', 'credit', 'debit'] as TxFilter[]).map((f) => (
                  <Chip
                    key={f}
                    label={
                      f === 'all'
                        ? 'All'
                        : f === 'credit'
                          ? 'Income'
                          : 'Deductions'
                    }
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
                      <AppText variant="bodySm" weight="bold" numberOfLines={1}>
                        {tx.label}
                      </AppText>
                      <AppText
                        variant="bodySm"
                        weight="bold"
                        color={
                          tx.credit
                            ? Colors.verified
                            : tx.label.includes('Payout')
                              ? Colors.info
                              : Colors.error
                        }
                      >
                        {tx.amount}
                      </AppText>
                    </View>
                    <View style={styles.txBottom}>
                      <AppText variant="caption" color={Colors.textTertiary}>
                        {tx.sub} · {tx.date}
                      </AppText>
                      <View style={styles.txStatus}>
                        {statusIcon(tx.status)}
                        <AppText
                          variant="caption"
                          weight="bold"
                          color={statusColor(tx.status)}
                        >
                          {capitalizeFirst(tx.status)}
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
              <AppText variant="bodySm" weight="bold" color={Colors.info}>
                See All Transactions
              </AppText>
              <ChevronRight size={16} color={Colors.info} />
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {/* Payout Sheet */}
      <Modal visible={showPayout} transparent animationType="fade">
        <Pressable
          style={styles.overlay}
          onPress={() => {
            Keyboard.dismiss();
            setShowPayout(false);
          }}
        >
          <Pressable style={styles.sheet} onPress={() => Keyboard.dismiss()}>
            <View style={styles.sheetHandle} />
            <AppText variant="h4" weight="bold">
              Request Payout
            </AppText>
            <AppText variant="caption" color={Colors.textSecondary}>
              Available balance:{' '}
              <AppText weight="bold" color={Colors.textPrimary}>
                {wallet.available}
              </AppText>
            </AppText>

            <View style={styles.amountWrap}>
              <AppText variant="h3" weight="bold" color={Colors.textPrimary}>
                ₱
              </AppText>
              <TextInput
                style={styles.amountInput}
                value={payoutAmount}
                onChangeText={setPayoutAmount}
                keyboardType="number-pad"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map((a) => (
                <Pressable
                  key={a}
                  style={styles.quickAmt}
                  onPress={() => setPayoutAmount(quickAmountValue(a))}
                >
                  <AppText variant="caption" weight="bold" color={Colors.info}>
                    ₱{a}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <AppText
              variant="caption"
              weight="bold"
              color={Colors.textTertiary}
              style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              Send to
            </AppText>
            <View style={styles.methodList}>
              {walletPayoutMethods.map((m) => (
                <Pressable
                  key={m.id}
                  style={[
                    styles.methodRow,
                    selectedMethod === m.id && styles.methodRowActive,
                  ]}
                  onPress={() => setSelectedMethod(m.id)}
                >
                  <View
                    style={[styles.methodDot, { backgroundColor: m.color }]}
                  />
                  <View style={styles.methodInfo}>
                    <AppText variant="bodySm" weight="bold">
                      {m.label}
                    </AppText>
                    <AppText variant="caption" color={Colors.textTertiary}>
                      {m.account}
                    </AppText>
                  </View>
                  {selectedMethod === m.id && (
                    <CheckCircle size={16} color={Colors.info} />
                  )}
                </Pressable>
              ))}
            </View>

            <View style={styles.payoutNote}>
              <AlertCircle size={12} color={Colors.textTertiary} />
              <AppText variant="caption" color={Colors.textTertiary}>
                Payouts are processed within 1–2 business days.
              </AppText>
            </View>

            <View style={styles.sheetActions}>
              <AppButton
                label="Cancel"
                variant="outline"
                onPress={() => setShowPayout(false)}
                style={{ flex: 1 }}
              />
<AppButton
                label="Confirm Payout"
                variant="primary"
                leftIcon={<ArrowDownToLine size={14} color={Colors.white} />}
                onPress={handleRequestPayout}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Top-Up Sheet */}
      <Modal visible={showTopUp} transparent animationType="fade">
        <Pressable
          style={styles.overlay}
          onPress={() => {
            Keyboard.dismiss();
            setShowTopUp(false);
          }}
        >
          <Pressable style={styles.sheet} onPress={() => Keyboard.dismiss()}>
            <View style={styles.sheetHandle} />
            <AppText variant="h4" weight="bold">
              Top-Up Wallet
            </AppText>
            <AppText variant="caption" color={Colors.textSecondary}>
              Available balance:{' '}
              <AppText weight="bold" color={Colors.textPrimary}>
                {wallet.available}
              </AppText>
            </AppText>

            <View style={styles.amountWrap}>
              <AppText variant="h3" weight="bold" color={Colors.textPrimary}>
                ₱
              </AppText>
              <TextInput
                style={styles.amountInput}
                value={topUpAmount}
                onChangeText={setTopUpAmount}
                keyboardType="number-pad"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map((a) => (
                <Pressable
                  key={a}
                  style={styles.quickAmt}
                  onPress={() => setTopUpAmount(quickAmountValue(a))}
                >
                  <AppText variant="caption" weight="bold" color={Colors.info}>
                    ₱{a}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <AppText
              variant="caption"
              weight="bold"
              color={Colors.textTertiary}
              style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              Pay with
            </AppText>
            <View style={styles.methodList}>
              {walletPayoutMethods.map((m) => (
                <Pressable
                  key={m.id}
                  style={[
                    styles.methodRow,
                    selectedTopUpMethod === m.id && styles.methodRowActive,
                  ]}
                  onPress={() => setSelectedTopUpMethod(m.id)}
                >
                  <View
                    style={[styles.methodDot, { backgroundColor: m.color }]}
                  />
                  <View style={styles.methodInfo}>
                    <AppText variant="bodySm" weight="bold">
                      {m.label}
                    </AppText>
                    <AppText variant="caption" color={Colors.textTertiary}>
                      {m.account}
                    </AppText>
                  </View>
                  {selectedTopUpMethod === m.id && (
                    <CheckCircle size={16} color={Colors.info} />
                  )}
                </Pressable>
              ))}
            </View>

            <View style={styles.payoutNote}>
              <AlertCircle size={12} color={Colors.textTertiary} />
              <AppText variant="caption" color={Colors.textTertiary}>
                Top-ups are processed instantly.
              </AppText>
            </View>

            <View style={styles.sheetActions}>
              <AppButton
                label="Cancel"
                variant="outline"
                onPress={() => setShowTopUp(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                label="Confirm Top-Up"
                variant="primary"
                leftIcon={<ArrowUpFromLine size={14} color={Colors.white} />}
                onPress={() =>
                  Alert.alert(
                    'Unavailable',
                    'Wallet top-up is unavailable until a payment provider is configured.',
                  )
                }
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
            <AppText variant="h3" weight="bold" align="center">
              Payout Requested
            </AppText>
            <AppText variant="body" color={Colors.textSecondary} align="center">
              Your payout of{' '}
              <AppText weight="bold" color={Colors.textPrimary}>
                ₱{formatWholeNumber(payoutAmount)}
              </AppText>{' '}
              to{' '}
              <AppText weight="bold" color={Colors.textPrimary}>
                {
                  walletPayoutMethods.find((m) => m.id === selectedMethod)
                    ?.label
                }
              </AppText>{' '}
              is being processed. Funds will arrive within 1–2 business days.
            </AppText>
            <AppButton
              label="Done"
              variant="primary"
              fullWidth
              onPress={() => setShowPayoutSuccess(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
