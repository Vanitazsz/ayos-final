import { Colors, Layout, Radius, Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    padding: Layout.screenPadding,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['6'],
  },
  title: {
    marginBottom: Spacing['4'],
  },
  subtitle: {
    marginBottom: Spacing['8'],
    paddingHorizontal: Spacing['2'],
    lineHeight: 22,
  },
  statusBox: {
    backgroundColor: Colors.surfaceCard,
    padding: Spacing['5'],
    borderRadius: Radius.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statusBoxTitle: {
    marginBottom: Spacing['4'],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing['3'],
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryLight,
    marginRight: Spacing['3'],
  },
  stepText: {
    flex: 1,
  },
  footer: {
    padding: Layout.screenPadding,
    backgroundColor: Colors.background,
    gap: Spacing['3'],
  },
});
