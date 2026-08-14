import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { Settings } from 'lucide-react-native';

export default function WorkerSettingsScreen() {
  return (
    <Screen
      scrollable
      keyboardAvoiding={false}
      contentContainerStyle={{ paddingBottom: 80 }}
      style={{ paddingBottom: 0 }}
    >
      <View style={styles.header}>
        <Text style={theme.typography.h2}>Settings</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Settings color={theme.colors.textTertiary} size={24} />
          <Text
            style={[
              theme.typography.body1,
              {
                color: theme.colors.textSecondary,
                textAlign: 'center',
                marginTop: theme.spacing.sm,
              },
            ]}
          >
            Settings and preferences can be managed from your Profile.
          </Text>
        </View>

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.layout.screenPadding,
    paddingBottom: theme.spacing.xxxl,
    justifyContent: 'center',
  },
  infoCard: { alignItems: 'center', padding: theme.spacing.lg },
});
