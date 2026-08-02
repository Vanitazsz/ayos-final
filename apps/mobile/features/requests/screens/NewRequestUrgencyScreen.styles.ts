import { Colors, Layout, Spacing } from '@/constants/theme';
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
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingBottom: 40,
  },
  headerTitle: {
    fontWeight: '700',
    marginBottom: Spacing[2],
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing[6],
  },
  optionsContainer: {
    gap: Spacing[3],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    backgroundColor: Colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[4],
  },
  cardText: {
    flex: 1,
  },
  footer: {
    padding: Layout.screenPadding,
    backgroundColor: Colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
