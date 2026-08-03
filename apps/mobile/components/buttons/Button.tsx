import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle, 
  TouchableOpacityProps 
} from 'react-native';
import { theme } from '@/constants/theme';
import { LucideIcon } from 'lucide-react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outlined' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: any;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  ...props
}) => {
  const getBackgroundColor = () => {
    if (disabled) return theme.colors.border;
    switch (variant) {
      case 'primary': return theme.colors.primary;
      case 'secondary': return theme.colors.secondary;
      case 'danger': return theme.colors.error;
      case 'outlined':
      case 'ghost':
        return 'transparent';
      default: return theme.colors.primary;
    }
  };

  const getBorderColor = () => {
    if (disabled) return theme.colors.border;
    if (variant === 'outlined') return theme.colors.primary;
    if (variant === 'danger' && style && (style as any).borderColor) return theme.colors.error;
    return 'transparent';
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.textTertiary;
    switch (variant) {
      case 'outlined':
      case 'ghost':
        return theme.colors.primary;
      case 'danger':
        return theme.colors.surface;
      default:
        return theme.colors.surface;
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'sm': return 36;
      case 'md': return 48;
      case 'lg': return 56;
      default: return 48;
    }
  };

  const containerStyles: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderColor: getBorderColor(),
    borderWidth: variant === 'outlined' ? 1 : 0,
    height: getHeight(),
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    width: fullWidth ? '100%' : 'auto',
    opacity: loading ? 0.7 : 1,
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={[containerStyles, style]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <Icon color={getTextColor()} size={20} style={styles.iconLeft} />
          )}
          <Text style={[
            styles.text, 
            theme.typography.button, 
            { color: getTextColor() },
            textStyle
          ]}>
            {title}
          </Text>
          {Icon && iconPosition === 'right' && (
            <Icon color={getTextColor()} size={20} style={styles.iconRight} />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  text: {
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: theme.spacing.sm,
  },
  iconRight: {
    marginLeft: theme.spacing.sm,
  },
});
