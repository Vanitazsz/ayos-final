import { theme } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: { flex: 1 },
  notificationCard: { flexDirection: 'row', padding: theme.spacing.lg },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  unreadBackground: { backgroundColor: `${theme.colors.primary}05` },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  textContainer: { flex: 1 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
});
