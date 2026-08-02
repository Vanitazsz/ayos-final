import { theme } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingVertical: theme.spacing.md },
  searchBar: { marginBottom: theme.spacing.md },
});
