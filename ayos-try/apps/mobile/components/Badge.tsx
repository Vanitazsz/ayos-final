import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { CheckCircle, BadgeCheck } from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { AppText } from './AppText';

interface BadgeProps {
  label: string;
  variant?: 'verified' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  icon?: React.ReactNode;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

const variantConfig = {
  verified: { bg: Colors.verifiedBg, text: Colors.verified, icon: <BadgeCheck size={14} color={Colors.verified} fill={Colors.verified} /> },
  success: { bg: Colors.successBg, text: Colors.success, icon: <CheckCircle size={14} color={Colors.success} /> },
  warning: { bg: Colors.warningBg, text: Colors.warning, icon: null },
  error: { bg: Colors.errorBg, text: Colors.error, icon: null },
  info: { bg: Colors.infoBg, text: Colors.info, icon: null },
  neutral: { bg: Colors.surfaceLight, text: Colors.textSecondary, icon: null },
};

export const Badge = React.memo(function Badge({
  label,
  variant = 'neutral',
  icon,
  style,
  size = 'sm',
}: BadgeProps) {
  const config = variantConfig[variant];
  const fontSize = size === 'sm' ? 11 : 13;
  const paddingH = size === 'sm' ? Spacing['2'] : Spacing['3'];
  const paddingV = size === 'sm' ? 3 : 5;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, paddingHorizontal: paddingH, paddingVertical: paddingV }, style]}>
      {icon || config.icon}
      <AppText style={{ fontSize, fontWeight: '600', color: config.text, marginLeft: icon || config.icon ? Spacing['1'] : 0 }}>
        {label}
      </AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
});
