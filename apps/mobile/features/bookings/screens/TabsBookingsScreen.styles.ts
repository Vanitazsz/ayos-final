import { theme } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabsScroll: { paddingHorizontal: theme.layout.screenPadding },
  tabButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: { borderBottomColor: theme.colors.primary },
  content: { flex: 1 },
  contentInner: { padding: theme.layout.screenPadding },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxxl,
  },
  bookingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  seeAllButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  seeAllText: {
    ...theme.typography.button,
    color: theme.colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.sm,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailText: { color: theme.colors.textSecondary, marginLeft: 4 },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
