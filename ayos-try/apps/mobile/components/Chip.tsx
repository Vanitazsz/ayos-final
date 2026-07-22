import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable, PressableProps } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppText } from '@/components/AppText';

interface ChipProps extends Omit<PressableProps, 'children'> {
  label: string;
  selected?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  size?: 'sm' | 'md';
  color?: string;
}

export const Chip = React.memo(function Chip({
  label,
  selected = false,
  leftIcon,
  rightIcon,
  style,
  size = 'md',
  color = Colors.cta,
  ...props
}: ChipProps) {
  const fontSize = size === 'sm' ? 12 : 14;
  const paddingH = size === 'sm' ? Spacing['3'] : Spacing['4'];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        {
          paddingHorizontal: paddingH,
          paddingVertical: size === 'sm' ? 6 : 9,
          backgroundColor: selected ? color : Colors.white,
          borderWidth: 1.5,
          borderColor: selected ? color : Colors.border,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      {...props}
    >
      {leftIcon}
      <AppText
        variant="caption"
        weight="semiBold"
        color={selected ? Colors.white : Colors.textPrimary}
        style={{
          marginHorizontal: (leftIcon || rightIcon) ? Spacing['1'] : 0,
        }}
      >
        {label}
      </AppText>
      {rightIcon}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
});
