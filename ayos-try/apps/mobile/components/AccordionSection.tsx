import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors, Radius, Spacing, Layout } from '@/constants/theme';
import { AppText } from '@/components/AppText';

interface AccordionSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isLast?: boolean;
}

export const AccordionSection = React.memo(function AccordionSection({
  title,
  isExpanded,
  onToggle,
  children,
  isLast = false,
}: AccordionSectionProps) {
  return (
    <View style={[styles.container, !isLast && styles.borderBottom]}>
      <Pressable
        style={styles.header}
        onPress={onToggle}
        hitSlop={12}
      >
        <AppText variant="body" weight="semiBold" color={Colors.textPrimary}>
          {title}
        </AppText>
        {isExpanded ? (
          <ChevronUp size={20} color={Colors.textTertiary} />
        ) : (
          <ChevronDown size={20} color={Colors.textTertiary} />
        )}
      </Pressable>
      {isExpanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing['4'],
  },
  content: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing['3'],
    gap: Spacing['2'],
  },
});
