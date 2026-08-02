import { Colors, Layout, Radius, Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Layout.screenPadding,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: Spacing[6],
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: -10,
    backgroundColor: Colors.cta,
    borderRadius: Radius.full,
    padding: Spacing[1],
    borderWidth: 3,
    borderColor: Colors.background,
  },
  title: {
    fontWeight: '700',
    marginBottom: Spacing[2],
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing[8],
    paddingHorizontal: Spacing[4],
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  cardInfo: {
    flex: 1,
  },
  footer: {
    padding: Layout.screenPadding,
    paddingBottom: 40,
  },
});
