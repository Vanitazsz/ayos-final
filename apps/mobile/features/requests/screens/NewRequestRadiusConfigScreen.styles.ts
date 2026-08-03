import { theme } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: { flex: 1 },
  mapContainer: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  mapGridPattern: {
    position: 'absolute',
    width: '200%',
    height: '200%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    opacity: 0.5,
  },
  radiusCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(30, 58, 138, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(30, 58, 138, 0.5)',
  },
  mapPin: { zIndex: 10 },
  mapBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    ...theme.shadows.sm,
  },

  configCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    marginTop: -20,
    ...theme.shadows.md,
  },
  radiusControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  radiusValueContainer: { flexDirection: 'row', alignItems: 'center' },

  barLabels: { flexDirection: 'row', justifyContent: 'space-between' },

  footer: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
    backgroundColor: theme.colors.surface,
  },
});
