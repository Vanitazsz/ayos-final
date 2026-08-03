import { theme } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: {
    paddingHorizontal: theme.layout.screenPadding,
    paddingBottom: theme.spacing.xxxl,
  },
  workerCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  workerAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.border,
  },
  workerInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: 'center',
  },
  workerHeader: { flexDirection: 'row', alignItems: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  priceContainer: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxxl,
    marginTop: theme.spacing.xl,
  },
});
