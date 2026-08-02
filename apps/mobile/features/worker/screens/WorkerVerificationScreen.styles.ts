import {
  Colors,
  Elevation,
  Layout,
  Radius,
  Spacing,
  theme,
} from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: Spacing['16'],
    paddingBottom: Spacing['4'],
    paddingHorizontal: Layout.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing['3'],
  },
  headerIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Status banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: theme.colors.primary,
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing['4'],
  },
  bannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245,166,35,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tabs
  tabsWrap: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing['4'],
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  tab: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.white },

  // Content
  scrollView: { flex: 1 },
  scrollContent: {
    padding: Layout.screenPadding,
    gap: Spacing['3'],
    paddingBottom: Spacing['10'],
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['4'],
    ...Elevation.sm,
  },

  // Progress
  progressWrap: { marginBottom: Spacing['4'], gap: Spacing['1'] },
  progressTrack: {
    height: 5,
    backgroundColor: Colors.borderLight,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.verified,
    borderRadius: 99,
  },

  // Steps
  stepRow: {
    flexDirection: 'row',
    gap: Spacing['3'],
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
    borderColor: 'rgba(245,166,35,0.4)',
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginVertical: 4,
    borderRadius: 1,
  },
  stepBody: { flex: 1, paddingTop: 2 },
  stepBodySpaced: { paddingBottom: Spacing['4'] },
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

  // Alert
  alertCard: {
    flexDirection: 'row',
    gap: Spacing['2'],
    borderRadius: Radius.lg,
    padding: Spacing['3'],
    borderWidth: 1,
  },

  // Doc summary
  docSummary: { flexDirection: 'row', gap: Spacing['2'] },
  docSummaryCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing['2'],
    alignItems: 'center',
  },

  // Doc row
  docRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing['2'],
    paddingVertical: Spacing['3'],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(11,31,77,0.06)',
  },
  docIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#F0F4FA',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  docBody: { flex: 1 },
  docRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  uploadBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Upload area
  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['1'],
    padding: Spacing['5'],
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(46,107,203,0.3)',
    backgroundColor: '#EEF4FF',
  },

  // FAQ
  faqItem: { borderBottomWidth: 1, borderBottomColor: 'rgba(11,31,77,0.07)' },
  faqQ: {
    paddingVertical: Spacing['3'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  faqA: {
    paddingBottom: Spacing['3'],
    paddingHorizontal: Spacing['3'],
    lineHeight: 18,
  },

  // Support
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing['4'],
    ...Elevation.sm,
  },
  supportBtn: {
    paddingVertical: Spacing['2'],
    paddingHorizontal: Spacing['3'],
    borderRadius: Radius.md,
    backgroundColor: '#EEF4FF',
  },
});
