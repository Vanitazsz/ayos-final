import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  View,
  StyleSheet,
  PressableProps,
  TextStyle,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Colors, Radius, Spacing, Typography, TouchTarget } from '@/constants/theme';
import { AppText } from './AppText';
import * as Haptics from 'expo-haptics';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface AppButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  labelStyle?: TextStyle;
  style?: StyleProp<ViewStyle>;
}

const sizeStyles: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 36, paddingHorizontal: Spacing['4'], fontSize: Typography.base },
  md: { height: 44, paddingHorizontal: Spacing['5'], fontSize: Typography.lg },
  lg: { height: 52, paddingHorizontal: Spacing['6'], fontSize: Typography.lg },
  xl: { height: 56, paddingHorizontal: Spacing['6'], fontSize: Typography.xl },
};

export const AppButton = React.memo(function AppButton({
  label,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  labelStyle,
  style,
  onPress,
  ...props
}: AppButtonProps) {
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  const getBgColor = (pressed: boolean): string => {
    if (disabled) return Colors.border;
    switch (variant) {
      case 'primary':
        return pressed ? Colors.ctaPressed : Colors.cta;
      case 'secondary':
        return pressed ? Colors.primarySurface : Colors.primarySurface;
      case 'outline':
        return pressed ? Colors.primarySurface : Colors.white;
      case 'ghost':
        return 'transparent';
      case 'danger':
        return pressed ? '#B71C1C' : Colors.error;
    }
  };

  const getTextColor = (): string => {
    if (disabled) return Colors.textTertiary;
    switch (variant) {
      case 'primary':
      case 'danger':
        return Colors.white;
      case 'secondary':
      case 'outline':
        return Colors.cta;
      case 'ghost':
        return Colors.cta;
    }
  };

  const getBorderColor = (): string => {
    switch (variant) {
      case 'outline':
        return Colors.primaryBorder;
      case 'secondary':
      case 'primary':
      case 'ghost':
      case 'danger':
        return 'transparent';
    }
  };

  const handlePress = (e: any) => {
    if (!isDisabled) {
      if (variant === 'primary' || variant === 'danger') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress?.(e);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          backgroundColor: getBgColor(pressed),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1.5 : 0,
          opacity: pressed && variant === 'ghost' ? 0.6 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityLabel={label}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <View style={styles.content}>
          {leftIcon}
          <AppText
            variant="button"
            weight="semiBold"
            color={getTextColor()}
            style={[{ fontSize: s.fontSize }, labelStyle]}
          >
            {label}
          </AppText>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TouchTarget,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
});
