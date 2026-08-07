import { StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

export const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.md, paddingHorizontal: theme.layout.screenPadding },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  menuButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: theme.layout.screenPadding, paddingBottom: theme.spacing.xxxl, paddingTop: theme.spacing.md },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight
  },
  unreadCard: {
    borderColor: `${theme.colors.primary}40`,
    backgroundColor: '#f8fafc',
  },
  iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  textContainer: { flex: 1, justifyContent: 'center' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary, marginLeft: theme.spacing.sm, alignSelf: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
  dropdownMenu: {
    position: 'absolute',
    right: theme.layout.screenPadding,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    ...theme.shadows.md,
    minWidth: 220,
    borderWidth: 1,
    borderColor: theme.colors.borderLight
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
  }
});
