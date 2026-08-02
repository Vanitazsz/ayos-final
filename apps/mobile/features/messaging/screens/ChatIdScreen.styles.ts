import { Colors, Layout, Radius, Spacing } from '@/constants/theme';
import { Platform, StyleSheet } from 'react-native';

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
    paddingBottom: Spacing['4'],
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: Spacing['3'],
  },
  headerInfo: {
    marginLeft: Spacing['3'],
  },
  hireBtn: {
    backgroundColor: Colors.cta,
  },
  chatContent: {
    padding: Layout.screenPadding,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing['3'],
    borderRadius: Radius.lg,
    marginBottom: Spacing['3'],
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  workerBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  timeText: {
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  quickRepliesContainer: {
    backgroundColor: Colors.background,
    paddingVertical: Spacing['2'],
  },
  quickRepliesList: {
    paddingHorizontal: Layout.screenPadding,
    gap: Spacing['2'],
  },
  quickReplyChip: {
    backgroundColor: Colors.primarySurface,
    paddingHorizontal: Spacing['4'],
    paddingVertical: Spacing['2'],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Layout.screenPadding,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  attachBtn: {
    padding: Spacing['2'],
    marginRight: Spacing['2'],
    marginBottom: 4,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing['4'],
    paddingVertical: Platform.OS === 'ios' ? Spacing['3'] : 0,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing['3'],
  },
});
