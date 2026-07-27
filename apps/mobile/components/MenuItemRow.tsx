import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppText } from '@/components/AppText';

interface MenuItemRowProps {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  color: string;
  bg: string;
  onPress?: () => void;
  isLast?: boolean;
}

export function MenuItemRow({ icon: Icon, label, color, bg, onPress, isLast }: MenuItemRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        {
          opacity: pressed ? 0.7 : 1,
          borderBottomWidth: isLast ? 0 : 1,
        },
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: bg }]}>
        <Icon size={20} color={color} strokeWidth={2} />
      </View>
      <AppText variant="body" weight="medium" style={{ flex: 1 }}>
        {label}
      </AppText>
      <ChevronRight size={20} color={Colors.textTertiary} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingHorizontal: Spacing['4'],
    paddingVertical: Spacing['4'],
    borderBottomColor: Colors.borderLight,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
