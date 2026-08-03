import { Colors, Elevation, Layout, Radius, Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing['16'],
    paddingBottom: Spacing['3'],
    paddingHorizontal: Layout.screenPadding,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing['2'],
  },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingBottom: Spacing['10'],
    gap: Spacing['3'],
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing['4'],
    height: 44,
    gap: Spacing['3'],
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },

  filterRow: { flexDirection: 'row', gap: Spacing['2'] },

  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing['2'],
  },
  dateInputWrap: { flex: 1, gap: Spacing['1'] },
  dateInput: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['2'],
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  dateGroup: { gap: Spacing['2'] },
  dateHeader: { marginTop: Spacing['1'] },
  txList: { gap: Spacing['2'] },
  txRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing['3'],
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['3'],
    ...Elevation.sm,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txBody: { flex: 1, gap: 2 },
  txTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txStatus: { flexDirection: 'row', alignItems: 'center', gap: 3 },

  emptyState: { paddingVertical: Spacing['10'], alignItems: 'center' },
});
