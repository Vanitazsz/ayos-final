import { Colors, Radius, Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing['4'],
    paddingTop: Spacing['14'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing['6'],
  },
  intro: { gap: Spacing['3'], marginBottom: Spacing['5'] },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing['6'],
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing['4'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
});
