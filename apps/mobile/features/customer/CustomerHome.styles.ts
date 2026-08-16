import { StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topNav: { backgroundColor: '#1e3a8a', paddingHorizontal: theme.layout.screenPadding, paddingBottom: theme.spacing.md, zIndex: 30 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing.md, height: 44, marginRight: theme.spacing.sm },
  searchInput: { flex: 1, marginLeft: theme.spacing.xs, fontSize: 14, color: theme.colors.textPrimary, paddingVertical: 0 },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.sm },
  badge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.error, borderWidth: 1, borderColor: '#1e3a8a' },
  avatarButton: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  headerAvatar: { width: '100%', height: '100%', backgroundColor: theme.colors.border },
  searchBackdrop: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 40 },
  searchDropdown: { position: 'absolute', left: theme.layout.screenPadding, right: theme.layout.screenPadding, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, ...theme.shadows.lg, zIndex: 50, paddingVertical: theme.spacing.xs },
  searchResultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  searchDropdownScroll: { flexGrow: 0 },
  searchEmpty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.lg },
  searchEmptyText: { ...theme.typography.body2, color: theme.colors.textSecondary, flexShrink: 1 },
  content: { flex: 1, zIndex: 5 },
  contentContainer: { paddingBottom: theme.spacing.xxxl, paddingTop: theme.spacing.lg },
  mainCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, marginHorizontal: theme.layout.screenPadding, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md, paddingHorizontal: theme.spacing.md, ...theme.shadows.md, marginBottom: theme.spacing.xl, borderWidth: 1, borderColor: theme.colors.borderLight },
  widgetsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.borderLight, paddingTop: theme.spacing.md },
  widgetCard: { flex: 0.48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.background, padding: theme.spacing.md, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.borderLight },

  aiPromoCard: { marginHorizontal: theme.layout.screenPadding, backgroundColor: '#1e40af', borderRadius: theme.radius.xl, flexDirection: 'row', overflow: 'hidden', marginBottom: theme.spacing.xl, ...theme.shadows.md },
  aiPromoContent: { flex: 1.5, padding: theme.spacing.lg, justifyContent: 'center' },
  aiPromoButton: { backgroundColor: theme.colors.surface, paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.radius.full, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' },
  aiPromoImage: { flex: 1, opacity: 0.9 },
  promoPressable: { flex: 1, flexDirection: 'row' },

  section: { marginBottom: theme.spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: theme.layout.screenPadding, marginBottom: theme.spacing.md },
  promoScroll: { paddingHorizontal: theme.layout.screenPadding, flexGrow: 0 },
  promoCard: { width: 280, height: 160, borderRadius: theme.radius.xl, marginRight: theme.spacing.md, overflow: 'hidden', justifyContent: 'flex-end' },
  promoTitle: { color: theme.colors.surface, marginBottom: 4 },
  promoSubtitle: { color: theme.colors.surface, opacity: 0.9 },
});
