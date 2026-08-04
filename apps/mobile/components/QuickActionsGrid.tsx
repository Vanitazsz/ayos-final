import React from 'react';
import { View, StyleSheet, Pressable, Dimensions, Alert } from 'react-native';
import { Colors, Radius, Spacing, Elevation, IconSize, Layout } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { router } from 'expo-router';
import { QUICK_ACTIONS } from './logic/QuickActionsGridLogic';

const { width: screenWidth } = Dimensions.get('window');
const CARD_GAP = Spacing['3'];
const CARD_WIDTH = (screenWidth - Layout.screenPadding * 2 - CARD_GAP) / 2;

export const QuickActionsGrid = React.memo(function QuickActionsGrid() {
  return (
    <View style={styles.grid}>
      {QUICK_ACTIONS.map((action) => (
        <Pressable
          key={action.id}
          style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
          onPress={() => {
            if (action.route) {
              router.push(action.route);
            } else {
              Alert.alert('Coming Soon', 'Premium features will be available soon.');
            }
          }}
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
