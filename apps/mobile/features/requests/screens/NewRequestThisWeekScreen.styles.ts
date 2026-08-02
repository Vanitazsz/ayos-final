import { Colors, Layout, Radius, Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  scrollContent: {
    padding: Layout.screenPadding,
    paddingBottom: 100,
  },
  section: {
    marginBottom: Layout.sectionSpacing,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    marginBottom: Spacing['3'],
  },
  sectionTitle: {
    fontWeight: '700',
  },
  daysContainer: {
    gap: Spacing['3'],
    paddingVertical: Spacing['1'],
  },
  dayChip: {
    paddingHorizontal: Spacing['5'],
    paddingVertical: Spacing['3'],
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timesContainer: {
    gap: Spacing['3'],
  },
  timeCard: {
    padding: Spacing['4'],
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeCardSelected: {
    backgroundColor: Colors.primarySurface,
    borderColor: Colors.primary,
  },
  footer: {
    padding: Layout.screenPadding,
    backgroundColor: Colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
