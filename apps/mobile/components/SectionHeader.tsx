import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppText } from './AppText';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export const SectionHeader = React.memo(function SectionHeader({
  title,
  actionLabel,
  onActionPress,
  style,
}: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <AppText variant="h4" weight="bold">
        {title}
      </AppText>
      {actionLabel && (
        <Pressable onPress={onActionPress} hitSlop={8} style={styles.action}>
          <AppText variant="bodySm" weight="semiBold" color={Colors.textLink}>
            {actionLabel}
          </AppText>
          <ChevronRight size={16} color={Colors.textLink} strokeWidth={2.5} />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
