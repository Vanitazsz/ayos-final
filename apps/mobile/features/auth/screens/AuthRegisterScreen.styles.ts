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
  content: { flex: 1, paddingBottom: theme.spacing.xxxl },
  title: { color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
  subtitle: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  roleContainer: { marginBottom: theme.spacing.xl },
  roleSubtitle: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  roleRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.border || '#e0e0e0',
    backgroundColor: '#fff',
  },
  roleCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  roleIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary + '14',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  roleIconCircleSelected: {
    backgroundColor: theme.colors.primary,
  },
  roleCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  roleCardTitleSelected: {
    color: theme.colors.primary,
  },
  roleCardDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  roleCardDescSelected: {
    color: theme.colors.primary,
  },
  form: { marginBottom: theme.spacing.xl },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.sm,
  },
  termsText: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  termsLink: { color: theme.colors.primary, fontWeight: '600' },
  submitBtn: { marginBottom: theme.spacing.xl },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
