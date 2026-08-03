import { Colors, Layout, Radius, Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 60,
    paddingBottom: Spacing[4],
    backgroundColor: Colors.background,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  section: { paddingHorizontal: Spacing['4'], marginBottom: Spacing['6'] },

  bookingCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['4'],
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 5,
    borderTopColor: Colors.primary,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing['4'],
  },
  bookingCardInfo: {
    flex: 1,
    paddingRight: Spacing['2'],
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceImage: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing['4'],
  },

  methodsList: { gap: Spacing['3'] },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing['4'],
    borderWidth: 1,
    gap: Spacing['3'],
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: { flex: 1 },
  selectedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.textTertiary,
  },

  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing['4'],
    paddingBottom: Spacing['6'],
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successBg,
    padding: Spacing['3'],
    borderRadius: Radius.md,
    gap: Spacing['2'],
    marginBottom: Spacing['4'],
  },
});
