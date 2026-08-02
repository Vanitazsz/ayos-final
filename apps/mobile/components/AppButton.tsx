import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  View,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import {
  Colors,
  Radius,
  Spacing,
  Typography,
  TouchTarget,
  theme,
} from '@/constants/theme';
import { AppText } from './AppText';
import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';

export type AppButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'outlined'
  | 'ghost'
  | 'danger';
export type AppButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AppButtonProps
  extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  labelStyle?: TextStyle;
  style?: StyleProp<ViewStyle>;
  legacyAppearance?: boolean;
}

export interface LegacyButtonProps
  extends Omit<AppButtonProps, 'label' | 'leftIcon' | 'rightIcon'> {
  title: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  textStyle?: TextStyle;
}

const sizeStyles: Record<
  AppButtonSize,
  { height: number; paddingHorizontal: number; fontSize: number }
> = {
  sm: {
    height: 36,
    paddingHorizontal: Spacing['4'],
    fontSize: Typography.base,
  },
  md: { height: 44, paddingHorizontal: Spacing['5'], fontSize: Typography.lg },
  lg: { height: 52, paddingHorizontal: Spacing['6'], fontSize: Typography.lg },
  xl: { height: 56, paddingHorizontal: Spacing['6'], fontSize: Typography.xl },
};

const legacyHeights: Record<AppButtonSize, number> = {
  sm: 36,
  md: 48,
  lg: 56,
  xl: 56,
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
  legacyAppearance = false,
  ...props
}: AppButtonProps) {
  const normalizedVariant = variant === 'outlined' ? 'outline' : variant;
  const sizing = sizeStyles[size];
  const isDisabled = disabled || loading;

  const backgroundColor = (pressed: boolean): string => {
    if (disabled) return Colors.border;
    if (legacyAppearance) {
      if (normalizedVariant === 'primary') return theme.colors.primary;
      if (normalizedVariant === 'secondary') return theme.colors.secondary;
      if (normalizedVariant === 'danger') return theme.colors.error;
      return 'transparent';
    }
    switch (normalizedVariant) {
      case 'primary':
        return pressed ? Colors.ctaPressed : Colors.cta;
      case 'secondary':
        return Colors.primarySurface;
      case 'outline':
        return pressed ? Colors.primarySurface : Colors.white;
      case 'ghost':
        return 'transparent';
      case 'danger':
        return pressed ? '#B71C1C' : Colors.error;
    }
  };

  const textColor = (): string => {
    if (disabled) return Colors.textTertiary;
    if (legacyAppearance) {
      return normalizedVariant === 'outline' || normalizedVariant === 'ghost'
        ? theme.colors.primary
        : theme.colors.surface;
    }
    return normalizedVariant === 'primary' || normalizedVariant === 'danger'
      ? Colors.white
      : Colors.cta;
  };

  const borderColor = (): string =>
    normalizedVariant === 'outline' ? Colors.primaryBorder : 'transparent';

  const handlePress = (event: GestureResponderEvent) => {
    if (isDisabled) return;
    if (!legacyAppearance) {
      void Haptics.impactAsync(
        normalizedVariant === 'primary' || normalizedVariant === 'danger'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      );
    }
    onPress?.(event);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: legacyAppearance ? legacyHeights[size] : sizing.height,
          paddingHorizontal: sizing.paddingHorizontal,
          backgroundColor: backgroundColor(pressed),
          borderColor: borderColor(),
          borderWidth:
            normalizedVariant === 'outline' ? (legacyAppearance ? 1 : 1.5) : 0,
          borderRadius: legacyAppearance ? theme.radius.md : Radius.lg,
          opacity:
            loading && legacyAppearance
              ? 0.7
              : pressed && normalizedVariant === 'ghost'
                ? 0.6
                : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor()} size="small" />
      ) : (
        <View style={styles.content}>
          {leftIcon}
          <AppText
            variant="button"
            weight="semiBold"
            color={textColor()}
            style={[{ fontSize: sizing.fontSize }, labelStyle]}
          >
            {label}
          </AppText>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
});

export function LegacyButton({
  title,
  icon: Icon,
  iconPosition = 'left',
  textStyle,
  size = 'md',
  ...props
}: LegacyButtonProps) {
  const icon = Icon ? <Icon color={Colors.white} size={20} /> : undefined;
  return (
    <AppButton
      {...props}
      label={title}
      size={size}
      leftIcon={iconPosition === 'left' ? icon : undefined}
      rightIcon={iconPosition === 'right' ? icon : undefined}
      labelStyle={textStyle}
      legacyAppearance
    />
  );
}

const styles = StyleSheet.create({
  base: {
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
