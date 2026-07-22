import React from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Calendar, DollarSign, Star, Shield } from 'lucide-react-native';
import { Colors, Radius, Spacing, Elevation, IconSize } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { router } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');
const CARD_GAP = Spacing['3'];
const CARD_WIDTH = (screenWidth - Layout.screenPadding * 2 - CARD_GAP) / 2;

import { Layout } from '@/constants/theme';

const quickActions = [
  { id: 'schedule', icon: Calendar, label: 'My Schedule', color: Colors.cta, bg: Colors.primarySurface },
  { id: 'earnings', icon: DollarSign, label: 'Earnings', color: Colors.success, bg: Colors.successBg },
  { id: 'premium', icon: Star, label: 'Premium', color: Colors.warning, bg: Colors.warningBg },
  { id: 'verification', icon: Shield, label: 'Verification', color: Colors.info, bg: Colors.infoBg },
];

export const QuickActionsGrid = React.memo(function QuickActionsGrid() {
  return (
    <View style={styles.grid}>
      {quickActions.map((action) => (
        <Pressable
          key={action.id}
          style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
          onPress={() => {}}
        >
          <View style={[styles.iconContainer, { backgroundColor: action.bg }]}>
            <action.icon size={IconSize.lg} color={action.color} strokeWidth={2} />
          </View>
          <AppText variant="caption" weight="semiBold" color={Colors.textPrimary}>
            {action.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['4'],
    alignItems: 'center',
    gap: Spacing['3'],
    ...Elevation.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
