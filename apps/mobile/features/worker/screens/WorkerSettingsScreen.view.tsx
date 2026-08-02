import { styles } from './WorkerSettingsScreen.styles';
import { View, Text, TouchableOpacity } from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { SearchBar } from '@/components/SearchBar';
import { ChevronRight, Languages, Settings } from 'lucide-react-native';
import type { useWorkerSettingsScreenController } from '../hooks/useWorkerSettingsScreenController';

export function WorkerSettingsView({
  model,
}: {
  model: ReturnType<typeof useWorkerSettingsScreenController>;
}) {
  const { searchQuery, setSearchQuery, router } = model;
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
