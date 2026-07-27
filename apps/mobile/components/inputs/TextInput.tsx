import React, { useState } from 'react';
import { 
  View, 
  TextInput as RNTextInput, 
  Text, 
  StyleSheet, 
  TextInputProps as RNTextInputProps, 
  TouchableOpacity 
} from 'react-native';
import { theme } from '@/constants/theme';
import { LucideIcon, Eye, EyeOff } from 'lucide-react-native';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  onRightIconPress?: () => void;
  isPassword?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  onRightIconPress,
  isPassword,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!isPassword);

  const getBorderColor = () => {
    if (error) return theme.colors.error;
    if (isFocused) return theme.colors.primary;
    return theme.colors.border;
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[theme.typography.label, styles.label, error && styles.errorText]}>
          {label}
        </Text>
      )}
      <View style={[
        styles.inputContainer,
        { borderColor: getBorderColor() },
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError
      ]}>
        {LeftIcon && (
          <LeftIcon color={isFocused ? theme.colors.primary : theme.colors.textTertiary} size={20} style={styles.leftIcon} />
        )}
        
        <RNTextInput
          style={[styles.input, theme.typography.body1, style]}
          placeholderTextColor={theme.colors.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !isPasswordVisible}
          {...props}
        />

        {isPassword ? (
          <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.rightIcon}>
            {isPasswordVisible ? (
              <EyeOff color={theme.colors.textTertiary} size={20} />
            ) : (
              <Eye color={theme.colors.textTertiary} size={20} />
            )}
          </TouchableOpacity>
        ) : RightIcon ? (
          <TouchableOpacity onPress={onRightIconPress} disabled={!onRightIconPress} style={styles.rightIcon}>
            <RightIcon color={theme.colors.textTertiary} size={20} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error && (
        <Text style={[theme.typography.caption, styles.errorText, styles.errorMargin]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  label: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.textPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    minHeight: 56,
    paddingHorizontal: theme.spacing.md,
  },
  inputContainerFocused: {
    backgroundColor: theme.colors.infoBackground,
  },
  inputContainerError: {
    backgroundColor: theme.colors.errorBackground,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.sm,
  },
  leftIcon: {
    marginRight: theme.spacing.sm,
  },
  rightIcon: {
    marginLeft: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.error,
  },
  errorMargin: {
    marginTop: theme.spacing.xs,
  },
});
