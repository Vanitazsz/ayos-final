import { StyleSheet } from 'react-native';
import { theme, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing['3'],
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSpacer: { width: 40 },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 88,
    gap: theme.spacing.lg,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.infoBackground,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  progressText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  progressStrong: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  progressDim: {
    color: theme.colors.textTertiary,
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    gap: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
  retryBtn: {
    alignSelf: 'flex-start',
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  emptyTitle: {
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptyDescription: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  inlineHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
  },
  inlineHintText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHint: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  industryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  industryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  industryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  industryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  industryChipTextActive: {
    color: theme.colors.surface,
  },
  skillsSection: {
    gap: theme.spacing.md,
  },
  skillCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accordionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  accordionTitle: {
    marginLeft: theme.spacing.sm,
    flexShrink: 1,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: theme.spacing.sm,
  },
  countBadgeText: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  skillCardBody: {
    marginTop: theme.spacing.md,
  },
  skillCardHint: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: theme.spacing.md,
  },
  skillsList: {
    gap: theme.spacing.sm,
  },
  skillBlock: {
    gap: theme.spacing.sm,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.md,
  },
  skillRowChecked: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}0D`,
  },
  skillRowError: {
    borderColor: theme.colors.error,
    backgroundColor: '#fef2f2',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  rateWrap: {
    marginBottom: theme.spacing.xs,
  },
  rateInput: {
    marginBottom: 0,
  },
  rateHelper: {
    color: theme.colors.textTertiary,
    fontSize: 12,
    marginTop: 4,
  },
  currencyPrefix: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
  },
  yearsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  yearBadge: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  yearBadgeActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  yearBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  yearBadgeTextActive: {
    color: theme.colors.surface,
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  reviewTitle: {
    marginLeft: theme.spacing.sm,
  },
  reviewList: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewLabel: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: theme.spacing.md,
  },
  reviewValue: {
    ...theme.typography.body2,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  reviewWarning: {
    ...theme.typography.body2,
    color: theme.colors.error,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  saveBar: {
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  confirmationOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.layout.screenPadding,
    backgroundColor: theme.colors.overlay,
  },
  confirmationDialog: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.lg,
  },
  confirmationIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.success,
  },
  confirmationTitle: {
    textAlign: 'center',
    color: theme.colors.textPrimary,
  },
  confirmationDescription: {
    marginBottom: 0,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
});
