import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Elevation } from '@/constants/theme';
import { AppText } from '@/components/AppText';

interface StatCardProps {
  value: string | number;
  label: string;
  color?: string;
}

export function StatCard({ value, label, color = Colors.cta }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <AppText variant="h3" weight="bold" color={color}>{value}</AppText>
      <AppText variant="caption" color={Colors.textSecondary}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    alignItems: 'center',
    gap: 4,
  },
});
