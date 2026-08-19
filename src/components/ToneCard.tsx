import React from 'react';
import { Pressable, StyleSheet, View, ViewProps } from 'react-native';
import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Colors, Elevation, Radius, Spacing } from '@/constants/theme';

type Tone = 'warning' | 'info';

const toneBg: Record<Tone, string> = {
  warning: Colors.warningBg,
  info: Colors.infoBg,
};

const toneFg: Record<Tone, string> = {
  warning: Colors.warning,
  info: Colors.info,
};

interface ToneCardProps extends ViewProps {
  tone: Tone;
  title: string;
  body?: string;
  icon?: ReactNode;
  action?: { label: string; onPress: () => void };
  children?: ReactNode;
}

export function ToneCard({
  tone,
  title,
  body,
  icon = <AlertCircle size={16} color={toneFg[tone]} />,
  action,
  children,
  style,
  ...props
}: ToneCardProps) {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: toneBg[tone], borderColor: `${toneFg[tone]}40` },
        style,
      ]}
      {...props}
    >
      <View style={styles.icon}>{icon}</View>
      <View style={styles.body}>
        <AppText variant="bodySm" weight="bold" color={toneFg[tone]}>
          {title}
        </AppText>
        {body && (
          <AppText variant="caption" color={Colors.textSecondary} style={styles.bodyText}>
            {body}
          </AppText>
        )}
        {action && (
          <Pressable onPress={action.onPress} style={styles.actionPressable}>
            <AppText
              variant="caption"
              weight="bold"
              color={toneFg[tone]}
              style={[styles.actionText, { borderBottomColor: toneFg[tone] }]}
            >
              {action.label}
            </AppText>
          </Pressable>
        )}
        {children && <View style={styles.children}>{children}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing['3'],
    padding: Spacing['4'],
    borderWidth: 1,
    borderRadius: Radius.xl,
    ...Elevation.sm,
  },
  icon: {
    flexShrink: 0,
    marginTop: 1,
  },
  body: { flex: 1 },
  bodyText: { marginTop: 2, lineHeight: 18 },
  children: { marginTop: 4, gap: 2 },
  actionPressable: {
    minHeight: 32,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  actionText: {
    borderBottomWidth: 1,
    paddingBottom: 1,
    alignSelf: 'flex-start',
  },
});
