import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { SearchBar } from '@/components/SearchBar';
import { ChevronRight, Languages, Settings } from 'lucide-react-native';

export default function WorkerSettingsScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Screen safeArea scrollable>
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

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search settings..."
          style={styles.searchBar}
        />
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => router.push('/settings/language')}
        >
          <Languages color={theme.colors.primary} size={22} />
          <Text style={[theme.typography.body1, styles.settingLabel]}>
            Message Language
          </Text>
          <ChevronRight color={theme.colors.textTertiary} size={20} />
        </TouchableOpacity>
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
  searchBar: { marginVertical: theme.spacing.md },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  settingLabel: { flex: 1, marginLeft: theme.spacing.md },
});
