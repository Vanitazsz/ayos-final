import { Colors, Elevation, Layout, Radius, Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing['16'],
    paddingBottom: Spacing['4'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingBottom: Spacing['10'],
    gap: Spacing['4'],
  },
  jobCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Layout.cardPadding,
    gap: Spacing['3'],
    ...Elevation.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  jobImage: { width: '100%', height: 180, borderRadius: Radius.lg },
  description: { fontStyle: 'italic' },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing['1'],
  },
  detailRow: { gap: Spacing['1'] },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
  },
  clientCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Layout.cardPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Elevation.sm,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  clientInfo: { gap: Spacing['1'] },
  statusBadgeRow: {
    flexDirection: 'row',
    gap: Spacing['2'],
    marginBottom: Spacing['2'],
  },

  // Hired
  hiredBanner: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['6'],
    alignItems: 'center',
    gap: Spacing['3'],
    ...Elevation.sm,
  },
  hiredIconRow: { marginBottom: Spacing['1'] },
  hiredTitle: { textAlign: 'center' },
  hiredSubtitle: { textAlign: 'center' },
  hiredActions: { width: '100%', gap: Spacing['2'], marginTop: Spacing['2'] },

  // En Route
  contactRow: { flexDirection: 'row', gap: Spacing['3'] },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['2'],
    paddingVertical: Spacing['3'],
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Elevation.sm,
  },

  // Accepted chat
  contactNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['2'],
    paddingVertical: Spacing['2'],
  },

  // Pending review
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['6'],
    alignItems: 'center',
    gap: Spacing['3'],
    ...Elevation.sm,
  },
  spinner: { marginBottom: Spacing['1'] },
  reviewTitle: { textAlign: 'center' },
  reviewSubtitle: { textAlign: 'center' },
  timeoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['1'],
    borderRadius: Radius.full,
  },

  // Cancelled
  cancelledBanner: {
    alignItems: 'center',
    gap: Spacing['2'],
    padding: Spacing['6'],
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    ...Elevation.sm,
  },
});
