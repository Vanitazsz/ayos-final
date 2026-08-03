import { theme } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.layout.screenPadding,
    paddingBottom: theme.spacing.xxxl,
    justifyContent: 'center',
  },
  infoCard: { alignItems: 'center', padding: theme.spacing.lg },
  searchBar: { marginVertical: theme.spacing.md },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  settingLabel: { flex: 1, marginLeft: theme.spacing.md },
});
