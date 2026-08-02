import { theme } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
  message: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    maxWidth: 420,
  },
  actions: {
    width: '100%',
    maxWidth: 360,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
  },
});
