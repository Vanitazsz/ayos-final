import { Colors, Layout, Radius, Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Layout.screenPadding,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['4'],
  },
  closeBtn: {
    padding: Spacing['1'],
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing['4'],
    borderRadius: Radius.lg,
    marginBottom: Spacing['4'],
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  messageBox: {
    backgroundColor: Colors.primarySurface,
    padding: Spacing['4'],
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginBottom: Spacing['6'],
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing['3'],
  },
  actionBtn: {
    flex: 1,
  },
});
