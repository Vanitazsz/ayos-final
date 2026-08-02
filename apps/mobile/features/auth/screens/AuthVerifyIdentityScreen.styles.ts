import { Colors, Radius, Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: Spacing['6'] },
  icon: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['4'],
  },
  subtitle: { marginTop: Spacing['2'], maxWidth: 420 },
  areaCard: {
    backgroundColor: Colors.verifiedBg,
    borderRadius: Radius.lg,
    padding: Spacing['3'],
    marginBottom: Spacing['4'],
    alignItems: 'center',
  },
  upload: { marginTop: Spacing['5'] },
  action: { marginTop: Spacing['5'] },
  feedback: {
    borderRadius: Radius.lg,
    padding: Spacing['3'],
    marginTop: Spacing['4'],
  },
  progressFeedback: {
    backgroundColor: Colors.primarySurface,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  errorFeedback: {
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  note: { marginTop: Spacing['3'], marginBottom: Spacing['8'] },
});
