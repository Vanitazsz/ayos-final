import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppText } from '@/components/AppText';

interface ScreenHeaderProps {
  title: string;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({ title, rightAction }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <AppText variant="h2" weight="bold">{title}</AppText>
      {rightAction}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['4'],
    paddingTop: Spacing['16'],
    paddingBottom: Spacing['3'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
});
