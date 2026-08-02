import { Colors, Spacing, Typography } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing['4'],
    paddingTop: 60,
    paddingBottom: Spacing['2'],
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['8'],
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['8'],
  },
  stepTitle: {
    marginBottom: Spacing['3'],
  },
  stepDesc: {
    lineHeight: Typography.lg * Typography.lineHeightRelaxed,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing['2'],
    paddingVertical: Spacing['6'],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.cta,
  },
  bottomSection: {
    paddingHorizontal: Spacing['4'],
    paddingBottom: Spacing['10'],
  },
  primaryBtn: {
    backgroundColor: Colors.cta,
    marginBottom: Spacing['4'],
  },
  signInLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
