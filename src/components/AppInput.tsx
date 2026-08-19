import React from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  TextInputProps,
  TextStyle,
  ViewStyle,
  Pressable,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { AppText } from './AppText';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  rightIconAccessibilityLabel?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export const AppInput = React.forwardRef<TextInput, AppInputProps>(function AppInput(
  {
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    onRightIconPress,
    rightIconAccessibilityLabel,
    containerStyle,
    inputStyle,
    style,
    ...props
  },
  ref,
) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <AppText variant="label" weight="medium" color={Colors.textPrimary} style={styles.label}>
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor: error ? Colors.error : Colors.border,
            backgroundColor: Colors.white,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            leftIcon ? { paddingLeft: 0 } : null,
            inputStyle,
            style,
          ]}
          placeholderTextColor={Colors.textTertiary}
          accessibilityLabel={label || props.placeholder}
          multiline={false}
          numberOfLines={1}
          {...props}
        />
        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            style={styles.rightIcon}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={rightIconAccessibilityLabel}
          >
            {rightIcon}
          </Pressable>
        )}
      </View>
      {error ? (
        <AppText variant="caption" color={Colors.error} style={styles.errorText}>
          {error}
        </AppText>
      ) : helperText ? (
        <AppText variant="caption" color={Colors.textSecondary} style={styles.errorText}>
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
});

export { AppInput as LegacyTextInput };

const styles = StyleSheet.create({
  container: {},
  label: {
    marginBottom: Spacing['2'],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing['4'],
    minHeight: 52,
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
