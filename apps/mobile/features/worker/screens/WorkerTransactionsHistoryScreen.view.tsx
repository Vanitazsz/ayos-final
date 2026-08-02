import { styles } from './WorkerTransactionsHistoryScreen.styles';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowDownToLine,
} from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import type { TransactionStatus } from '../logic/WorkerTransactionsHistoryScreenLogic';
import { Chip } from '@/components/Chip';
import type { useWorkerTransactionsHistoryScreenController } from '../hooks/useWorkerTransactionsHistoryScreenController';
type TxFilter = 'all' | 'credit' | 'debit';

const statusIcon = (s: TransactionStatus) => {
  if (s === 'completed')
    return <CheckCircle size={12} color={Colors.verified} />;
  if (s === 'pending') return <Clock size={12} color={Colors.warning} />;
  return <AlertCircle size={12} color={Colors.error} />;
};

const statusColor = (s: TransactionStatus) => {
  if (s === 'completed') return Colors.verified;
  if (s === 'pending') return Colors.warning;
  return Colors.error;
};
export function TransactionsHistoryView({
  model,
}: {
  model: ReturnType<typeof useWorkerTransactionsHistoryScreenController>;
}) {
  const {
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
  } = model;
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <AppText variant="h3" weight="bold" style={{ flex: 1 }}>
          Transaction History
        </AppText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Type Filters */}
        <View style={styles.filterRow}>
          {(['all', 'credit', 'debit'] as TxFilter[]).map((f) => (
            <Chip
              key={f}
              label={
                f === 'all' ? 'All' : f === 'credit' ? 'Income' : 'Deductions'
              }
              selected={txFilter === f}
              onPress={() => setTxFilter(f)}
              size="sm"
            />
          ))}
        </View>

        {/* Date Range */}
        <View style={styles.dateRangeRow}>
          <View style={styles.dateInputWrap}>
            <AppText variant="caption" color={Colors.textTertiary}>
              From
            </AppText>
            <TextInput
              style={styles.dateInput}
              placeholder="e.g. Oct 10"
              placeholderTextColor={Colors.textTertiary}
              value={fromDate}
              onChangeText={setFromDate}
            />
          </View>
          <AppText variant="body" color={Colors.textTertiary}>
            —
          </AppText>
          <View style={styles.dateInputWrap}>
            <AppText variant="caption" color={Colors.textTertiary}>
              To
            </AppText>
            <TextInput
              style={styles.dateInput}
              placeholder="e.g. Oct 14"
              placeholderTextColor={Colors.textTertiary}
              value={toDate}
              onChangeText={setToDate}
            />
          </View>
        </View>

        {/* Transaction Groups */}
        {groupedTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <AppText variant="body" color={Colors.textSecondary} align="center">
              No transactions found
            </AppText>
          </View>
        ) : (
          groupedTransactions.map(([date, txs]) => (
            <View key={date} style={styles.dateGroup}>
              <AppText
                variant="bodySm"
                weight="bold"
                color={Colors.textSecondary}
                style={styles.dateHeader}
              >
                {date}
              </AppText>
              <View style={styles.txList}>
                {txs.map((tx) => (
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
                        <AppText
                          variant="bodySm"
                          weight="bold"
                          numberOfLines={1}
                        >
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
                          {tx.sub}
                        </AppText>
                        <View style={styles.txStatus}>
                          {statusIcon(tx.status)}
                          <AppText
                            variant="caption"
                            weight="bold"
                            color={statusColor(tx.status)}
                          >
                            {tx.status.charAt(0).toUpperCase() +
                              tx.status.slice(1)}
                          </AppText>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
