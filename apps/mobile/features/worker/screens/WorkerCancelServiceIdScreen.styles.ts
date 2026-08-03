import { Colors, Elevation, Layout, Radius, Spacing } from '@/constants/theme';
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
    backgroundColor: Colors.white,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing['16'],
    paddingBottom: Spacing['4'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingBottom: Spacing['10'],
  },
  titleSection: {
    marginBottom: Spacing['5'],
    gap: Spacing['2'],
  },
  stageSection: {
    marginBottom: Spacing['5'],
  },
  stageLabel: {
    marginBottom: Spacing['2'],
  },
  stageDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingHorizontal: Layout.cardPadding,
    paddingVertical: Spacing['3'],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stageOptions: {
    marginTop: Spacing['2'],
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  stageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.cardPadding,
    paddingVertical: Spacing['3'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  stageOptionSelected: {
    backgroundColor: Colors.primarySurface,
  },
  accordionContainer: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing['5'],
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.md,
    padding: Spacing['3'],
  },
  reasonOptionSelected: {
    backgroundColor: Colors.primarySurface,
  },
  otherSection: {
    marginBottom: Spacing['5'],
  },
  inputContainer: {
    marginTop: Spacing['2'],
    position: 'relative',
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Layout.cardPadding,
    paddingVertical: Spacing['3'],
    fontSize: 16,
    color: Colors.textPrimary,
  },
  recommendations: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing['2'],
    overflow: 'hidden',
    zIndex: 100,
    ...Elevation.lg,
  },
  recommendationItem: {
    paddingHorizontal: Layout.cardPadding,
    paddingVertical: Spacing['3'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  confirmSection: {
    marginTop: Spacing['2'],
  },
});
