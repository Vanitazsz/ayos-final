import { Colors, Radius, Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing['3'],
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerSpacer: { width: 40 },
  content: { gap: Spacing['4'], paddingBottom: Spacing['8'] },
  card: {
    gap: Spacing['3'],
    padding: Spacing['4'],
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  readinessDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  readinessDotReady: { backgroundColor: Colors.verified },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  onlineCopy: { flex: 1, gap: Spacing['1'] },
  errorCard: {
    padding: Spacing['3'],
    borderRadius: Radius.lg,
    backgroundColor: Colors.errorBg,
  },
});
