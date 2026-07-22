import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { Colors, Radius, Spacing, Elevation } from '@/constants/theme';
import { AppText } from './AppText';
import * as Haptics from 'expo-haptics';

interface ServiceCategoryCardProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  style?: ViewStyle;
  backgroundColor?: string;
  iconColor?: string;
}

export const ServiceCategoryCard = React.memo(function ServiceCategoryCard({
  icon,
  label,
  onPress,
  style,
  backgroundColor = Colors.primarySurface,
  iconColor = Colors.cta,
}: ServiceCategoryCardProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        Elevation.sm,
        { opacity: pressed ? 0.85 : 1 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.iconContainer, { backgroundColor }]}>
        {icon}
      </View>
      <AppText variant="caption" weight="medium" color={Colors.textPrimary} align="center" numberOfLines={2}>
        {label}
      </AppText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    padding: Spacing['3'],
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2'],
  },
});
