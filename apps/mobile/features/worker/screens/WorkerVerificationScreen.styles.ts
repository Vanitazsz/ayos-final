import { StyleSheet } from 'react-native';
import { theme, Spacing, TouchTarget } from '@/constants/theme';

export const styles = StyleSheet.create({
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
  },
  headerTitle: { flex: 1, textAlign: 'center' },
  headerSpacer: { width: 44 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
  },
  bannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabsTrack: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 3,
    gap: 3,
    marginBottom: theme.spacing.lg,
  },
  tab: {
    flex: 1,
    minHeight: TouchTarget,
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },

  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    gap: Spacing['3'],
    paddingBottom: theme.spacing.xxl,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },

  // Steps / progress
  progressWrap: { marginBottom: theme.spacing.md, gap: theme.spacing.xs },
  progressTrack: {
    height: 5,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.secondary,
    borderRadius: 99,
  },
  stepRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  stepLeft: { flexDirection: 'column', alignItems: 'center', flexShrink: 0 },
  stepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulse: {
    position: 'absolute',
    inset: -3,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: `${theme.colors.warning}66`,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginVertical: 4,
    borderRadius: 1,
  },
  stepBody: { flex: 1, paddingTop: 2 },
  stepBodySpaced: { paddingBottom: theme.spacing.md },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  stepNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },

  // Alerts
  alertCard: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    borderWidth: 1,
  },
  alertActionPressable: {
    minHeight: TouchTarget,
    justifyContent: 'center',
    marginTop: 2,
  },
  alertActionText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
    borderBottomWidth: 1,
    paddingBottom: 1,
    alignSelf: 'flex-start',
  },

  // Tips
  tipsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  tipsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginBottom: 6,
  },
  tipsBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    flexShrink: 0,
    marginTop: 5,
  },

  // Next steps
  nextStepsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  nextStepsIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStepsText: { fontWeight: '500' },

  // Doc summary
  docSummary: { flexDirection: 'row', gap: theme.spacing.sm },
  docSummaryCard: {
    flex: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },

  // Doc row
  docRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  docRowAttention: {
    marginHorizontal: -theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
  },
  docIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  docBody: { flex: 1 },
  docRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  uploadBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.colors.infoBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.colors.errorBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  docDate: { fontSize: 9 },

  // Upload area
  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: `${theme.colors.primary}40`,
    backgroundColor: theme.colors.infoBackground,
  },
  draftPick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    alignSelf: 'stretch',
    minHeight: TouchTarget,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
  },
  draftPickFilled: { backgroundColor: theme.colors.successBackground },
  submitBtn: { alignSelf: 'stretch', marginTop: theme.spacing.xs },

  // FAQ
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  faqQ: {
    minHeight: TouchTarget,
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  faqA: {
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    lineHeight: 18,
  },

  // Support
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  supportBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.infoBackground,
  },

  // Loading / error
  skeletonBlock: { marginBottom: theme.spacing.sm },
  errorCard: {
    backgroundColor: theme.colors.errorBackground,
    borderColor: theme.colors.error,
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
  retryBtn: { alignSelf: 'flex-start' },
});
