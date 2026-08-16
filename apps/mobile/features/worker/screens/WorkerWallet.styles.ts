import { StyleSheet, Dimensions } from 'react-native';
import { Colors, Radius, Spacing, Elevation, Layout, Typography, theme } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingVertical: Spacing['3'],
    paddingHorizontal: theme.layout.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerSpacer: { width: 40 },
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
  topupStatusCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    padding: Spacing['4'], gap: Spacing['2'], ...Elevation.sm,
    marginBottom: theme.spacing.xl,
  },
  topupStatusHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },

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
  txSection: {
    backgroundColor: Colors.surfaceCard, borderRadius: Radius.xl,
    padding: Spacing['4'], gap: Spacing['3'],
    marginBottom: theme.spacing.xl, ...Elevation.sm,
  },
  txHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAllLink: { flexDirection: 'row', alignItems: 'center' },
  txFilters: { flexDirection: 'row', justifyContent: 'flex-start', gap: Spacing['2'] },
  txList: { gap: Spacing['2'] },
  txEmpty: {
    textAlign: 'center',
    paddingVertical: Spacing['4'],
  },
  txRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing['3'],
    backgroundColor: Colors.background, borderRadius: Radius.xl,
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
  referenceInput: {
    backgroundColor: Colors.surfaceLight, borderRadius: Radius.xl,
    paddingHorizontal: Spacing['4'], paddingVertical: Spacing['3'],
    fontSize: Typography.lg, fontWeight: '600',
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
});
