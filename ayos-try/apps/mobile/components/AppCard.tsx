import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing, Elevation } from '@/constants/theme';

interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  radius?: number;
  elevation?: keyof typeof Elevation;
  backgroundColor?: string;
  borderWidth?: number;
  borderColor?: string;
}

export const AppCard = React.memo(function AppCard({
  children,
  style,
  padding = Spacing['4'],
  radius = Radius.lg,
  elevation = 'sm',
  backgroundColor = Colors.surfaceCard,
  borderWidth = 0,
  borderColor = Colors.border,
}: AppCardProps) {
  return (
    <View
      style={[
        styles.base,
        Elevation[elevation],
        {
          borderRadius: radius,
          padding,
          backgroundColor,
          borderWidth,
          borderColor,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  base: {},
});
