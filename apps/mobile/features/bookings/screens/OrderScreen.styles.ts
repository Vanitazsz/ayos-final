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
    paddingBottom: 120,
  },
  statusAlert: {
    backgroundColor: Colors.primary,
    padding: Spacing[4],
    borderRadius: Radius.lg,
    marginBottom: Spacing[6],
  },
  section: {
    marginBottom: Spacing[6],
  },
  sectionTitle: {
    marginBottom: Spacing[3],
  },
  card: {
    backgroundColor: Colors.white,
    padding: Spacing[4],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: {
    marginLeft: Spacing[3],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing[4],
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerInfo: {
    marginLeft: Spacing[4],
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing[4],
    paddingBottom: Spacing[6],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});
