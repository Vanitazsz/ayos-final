import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
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
import { Colors, Radius, Spacing, Elevation, Layout, Typography } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { fetchWalletTransactions, type WalletTransaction, type TransactionStatus } from '@/services/api';

type TxFilter = 'all' | 'credit' | 'debit';

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

export default function TransactionsHistoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [transactions,setTransactions]=useState<WalletTransaction[]>([]);
  useEffect(()=>{void fetchWalletTransactions().then((result)=>setTransactions(result.data));},[]);

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
      const months: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <AppText variant="h3" weight="bold" style={{ flex: 1 }}>Transaction History</AppText>
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
              label={f === 'all' ? 'All' : f === 'credit' ? 'Income' : 'Deductions'}
              selected={txFilter === f}
              onPress={() => setTxFilter(f)}
              size="sm"
            />
          ))}
        </View>

        {/* Date Range */}
        <View style={styles.dateRangeRow}>
          <View style={styles.dateInputWrap}>
            <AppText variant="caption" color={Colors.textTertiary}>From</AppText>
            <TextInput
              style={styles.dateInput}
              placeholder="e.g. Oct 10"
              placeholderTextColor={Colors.textTertiary}
              value={fromDate}
              onChangeText={setFromDate}
            />
          </View>
          <AppText variant="body" color={Colors.textTertiary}>—</AppText>
          <View style={styles.dateInputWrap}>
            <AppText variant="caption" color={Colors.textTertiary}>To</AppText>
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
            <AppText variant="body" color={Colors.textSecondary} align="center">No transactions found</AppText>
          </View>
        ) : (
          groupedTransactions.map(([date, txs]) => (
            <View key={date} style={styles.dateGroup}>
              <AppText variant="bodySm" weight="bold" color={Colors.textSecondary} style={styles.dateHeader}>
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
                        <AppText variant="caption" color={Colors.textTertiary}>{tx.sub}</AppText>
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
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Spacing['16'], paddingBottom: Spacing['3'],
    paddingHorizontal: Layout.screenPadding,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: Spacing['2'] },
  scrollView: { flex: 1 },
  scrollContent: { padding: Layout.screenPadding, paddingBottom: Spacing['10'], gap: Spacing['3'] },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.full,
    paddingHorizontal: Spacing['4'], height: 44, gap: Spacing['3'],
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },

  filterRow: { flexDirection: 'row', gap: Spacing['2'] },

  dateRangeRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing['2'],
  },
  dateInputWrap: { flex: 1, gap: Spacing['1'] },
  dateInput: {
    backgroundColor: Colors.white, borderRadius: Radius.md,
    paddingHorizontal: Spacing['3'], paddingVertical: Spacing['2'],
    fontSize: 14, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.borderLight,
  },

  dateGroup: { gap: Spacing['2'] },
  dateHeader: { marginTop: Spacing['1'] },
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

  emptyState: { paddingVertical: Spacing['10'], alignItems: 'center' },
});
