import React, { useState } from 'react';
import {
  TextInput as NativeTextInput,
  View,
  StyleSheet,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
  Pressable,
} from 'react-native';
import { Colors, Radius, Spacing, Typography, theme } from '@/constants/theme';
import { AppText } from './AppText';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';

export interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  legacyAppearance?: boolean;
}

export interface LegacyTextInputProps
  extends Omit<AppInputProps, 'leftIcon' | 'rightIcon'> {
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  isPassword?: boolean;
}

export const AppInput = React.forwardRef<NativeTextInput, AppInputProps>(
  function AppInput(
    {
      label,
      error,
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      inputStyle,
      style,
      legacyAppearance = false,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) {
    const [focused, setFocused] = useState(false);
    const borderColor = error
      ? Colors.error
      : focused && legacyAppearance
        ? theme.colors.primary
        : Colors.border;

    return (
      <View
        style={[legacyAppearance && styles.legacyContainer, containerStyle]}
      >
        {label && (
          <AppText
            variant="label"
            weight="medium"
            color={
              error && legacyAppearance ? Colors.error : Colors.textPrimary
            }
            style={styles.label}
          >
            {label}
          </AppText>
        )}
        <View
          style={[
            styles.inputWrapper,
            legacyAppearance && styles.legacyInputWrapper,
            {
              borderColor,
              backgroundColor:
                legacyAppearance && focused
                  ? theme.colors.infoBackground
                  : legacyAppearance && error
                    ? theme.colors.errorBackground
                    : Colors.white,
            },
          ]}
        >
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <NativeTextInput
            ref={ref}
            style={[
              styles.input,
              legacyAppearance && theme.typography.body1,
              leftIcon ? { paddingLeft: 0 } : null,
              inputStyle,
              style,
            ]}
            placeholderTextColor={Colors.textTertiary}
            accessibilityLabel={label || props.placeholder}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            {...props}
          />
          {rightIcon && (
            <Pressable
              onPress={onRightIconPress}
              style={styles.rightIcon}
              hitSlop={8}
            >
              {rightIcon}
            </Pressable>
          )}
        </View>
        {error && (
          <AppText
            variant="caption"
            color={Colors.error}
            style={styles.errorText}
          >
            {error}
          </AppText>
        )}
      </View>
    );
  },
);

export const LegacyTextInput = React.forwardRef<
  NativeTextInput,
  LegacyTextInputProps
>(function LegacyTextInput(
  { leftIcon: LeftIcon, rightIcon: RightIcon, isPassword = false, ...props },
  ref,
) {
  const [passwordVisible, setPasswordVisible] = useState(!isPassword);
  const rightIcon = isPassword ? (
    passwordVisible ? (
      <EyeOff color={Colors.textTertiary} size={20} />
    ) : (
      <Eye color={Colors.textTertiary} size={20} />
    )
  ) : RightIcon ? (
    <RightIcon color={Colors.textTertiary} size={20} />
  ) : undefined;

  return (
    <AppInput
      {...props}
      ref={ref}
      leftIcon={
        LeftIcon ? (
          <LeftIcon color={Colors.textTertiary} size={20} />
        ) : undefined
      }
      rightIcon={rightIcon}
      onRightIconPress={
        isPassword
          ? () => setPasswordVisible((visible) => !visible)
          : props.onRightIconPress
      }
      secureTextEntry={isPassword && !passwordVisible}
      legacyAppearance
    />
  );
});

const styles = StyleSheet.create({
  legacyContainer: {
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  label: {
    marginBottom: Spacing['2'],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing['4'],
    minHeight: 52,
  },
  legacyInputWrapper: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    minHeight: 56,
  },
  input: {
    flex: 1,
    fontSize: Typography.lg,
    color: Colors.textPrimary,
    paddingVertical: Spacing['3'],
    fontFamily: Typography.fontRegular,
  },
  leftIcon: {
    marginRight: Spacing['3'],
  },
  rightIcon: {
    padding: Spacing['1'],
  },
  errorText: {
    marginTop: Spacing['1'],
  },
});
