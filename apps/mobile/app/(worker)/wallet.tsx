import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
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
import { Colors, theme } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Badge } from '@/components/Badge';
import { Chip } from '@/components/Chip';
import { type TransactionStatus, simulateTopUp } from '@/services/api';
import { showAlert } from '@/components/AppAlert';
import { styles } from './wallet.styles';
import { useWalletData, type Period, type TxFilter } from '@/hooks/useWalletData';

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

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('week');
  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('5000');
  const [selectedTopUpMethod, setSelectedTopUpMethod] = useState('gcash');
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);

  const {
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
  } = useWalletData(period, txFilter);

  const handleSimulateTopUp = async () => {
    const numAmount = Number(topUpAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) {
      showAlert('Invalid Amount', 'Please select or enter a valid top-up amount.');
      return;
    }
    try {
      setIsTopUpLoading(true);
      const result = await simulateTopUp(numAmount);
      setShowTopUp(false);
      await refresh();
      showAlert(
        'Simulated Top-Up Successful',
        `Worker selects: ₱${numAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n` +
        `Simulated payment status: ${result.status}\n` +
        `Previous wallet balance: ₱${Number(result.previousBalance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n` +
        `New wallet balance: ₱${Number(result.newBalance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      );
    } catch (err: any) {
      showAlert('Top-Up Failed', err?.message ?? 'Failed to process simulated top-up.');
    } finally {
      setIsTopUpLoading(false);
    }
  };

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
              label="Simulate Top-Up"
              variant="outline"
              size="sm"
              leftIcon={<ArrowUpFromLine size={14} color={Colors.cta} />}
              onPress={() => {
                setTopUpAmount('500');
                setShowTopUp(true);
              }}
              style={styles.balanceBtn}
            />
            <AppButton
              label="Payout"
              variant="secondary"
              size="sm"
              disabled
              leftIcon={<ArrowDownToLine size={14} color={Colors.textTertiary} />}
              onPress={() => showAlert('Unavailable','Wallet payout is unavailable until a payment provider is configured.')}
              style={styles.balanceBtn}
            />
          </View>
        </View>

        {/* Bar Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <AppText variant="body" weight="bold">Daily Earnings — This Week</AppText>
            <Badge label={`Peak: ₱${barMax.toLocaleString()}`} variant="info" size="sm" />
          </View>
          <View style={styles.barChart}>
            {walletBarData.map((d, i) => (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${(d.val / barMax) * 100}%`,
                        backgroundColor: d.val === barMax ? Colors.verified : Colors.info,
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
            <AppText variant="h4">Transactions</AppText>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(worker)/transactions-history',
                  params: { from: 'wallet' },
                })
              }
              style={styles.seeAllLink}
            >
              <AppText variant="caption" color={Colors.primary}>See All</AppText>
              <ChevronRight size={14} color={Colors.primary} />
            </Pressable>
          </View>
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
          <View style={styles.txList}>
            {filteredTransactions.length === 0 ? (
              <AppText variant="body" color={Colors.textTertiary} style={styles.txEmpty}>
                No transactions found
              </AppText>
            ) : (
              filteredTransactions.map((tx) => (
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
            )))}
          </View>
        </View>
      </ScrollView>
      </View>

      {/* Top-Up Sheet */}
      <Modal visible={showTopUp} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => { Keyboard.dismiss(); setShowTopUp(false); }}>
          <Pressable style={styles.sheet} onPress={() => Keyboard.dismiss()}>
            <View style={styles.sheetHandle} />
            <AppText variant="h4" weight="bold">Simulate Top-Up</AppText>
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

            <AppText variant="caption" weight="bold" color={Colors.textTertiary} style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12 }}>
              Preset Amounts
            </AppText>
            <View style={styles.quickAmounts}>
              {['100', '200', '500', '1,000'].map((a) => (
                <Pressable
                  key={a}
                  style={[
                    styles.quickAmt,
                    topUpAmount === a.replace(',', '') && { backgroundColor: Colors.cta, borderColor: Colors.cta },
                  ]}
                  onPress={() => setTopUpAmount(a.replace(',', ''))}
                >
                  <AppText
                    variant="caption"
                    weight="bold"
                    color={topUpAmount === a.replace(',', '') ? Colors.white : Colors.info}
                  >
                    ₱{a}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <View style={styles.payoutNote}>
              <AlertCircle size={14} color={Colors.warning} />
              <AppText variant="caption" color={Colors.textSecondary} style={{ flex: 1 }}>
                This is a simulated top-up for demonstration purposes. No actual payment will be processed.
              </AppText>
            </View>

            <View style={styles.sheetActions}>
              <AppButton label="Cancel" variant="outline" onPress={() => setShowTopUp(false)} style={{ flex: 1 }} />
              <AppButton
                label="Simulate Top-Up"
                variant="primary"
                leftIcon={<ArrowUpFromLine size={14} color={Colors.white} />}
                loading={isTopUpLoading}
                disabled={isTopUpLoading}
                onPress={handleSimulateTopUp}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}


