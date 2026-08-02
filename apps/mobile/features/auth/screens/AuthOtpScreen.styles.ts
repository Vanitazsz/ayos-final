import { theme } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: { paddingVertical: theme.spacing.md },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: { flex: 1, paddingTop: theme.spacing.xl },
  title: { color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
  subtitle: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    textAlign: 'center',
    color: theme.colors.textPrimary,
  },
  otpInputFilled: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.infoBackground,
  },
  otpInputError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorBackground,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    marginTop: -theme.spacing.md,
  },
  submitBtn: { marginBottom: theme.spacing.xl },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
