import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Info } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface InfoCardProps {
  title: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const infoCardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.infoBackground,
    borderWidth: 1,
    borderColor: theme.colors.info,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.info,
    marginBottom: 2,
  },
  bodyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  highlight: {
    color: theme.colors.info,
    fontWeight: '700',
  },
});

export function InfoCard({ title, children, style }: InfoCardProps) {
  return (
    <View style={[infoCardStyles.card, style]} testID="info-card">
      <Info size={16} color={theme.colors.info} />
      <View style={infoCardStyles.body}>
        <Text style={infoCardStyles.title} testID="info-card-title">
          {title}
        </Text>
        <Text style={infoCardStyles.bodyText} testID="info-card-body">
          {children}
        </Text>
      </View>
    </View>
  );
}

export function InfoCardHighlight({ children }: { children?: React.ReactNode }) {
  return (
    <Text style={infoCardStyles.highlight} testID="info-card-highlight">
      {children}
    </Text>
  );
}
