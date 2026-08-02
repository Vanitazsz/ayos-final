import { styles } from './SettingsLanguageScreen.styles';
import { Pressable, View } from 'react-native';
import { Check, ChevronLeft, Languages } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Colors } from '@/constants/theme';
import type { useSettingsLanguageScreenController } from '../hooks/useSettingsLanguageScreenController';
const OPTIONS = [
  { value: 'en' as const, label: 'English' },
  { value: 'fil' as const, label: 'Filipino' },
];
export function LanguageSettingsView({
  model,
}: {
  model: ReturnType<typeof useSettingsLanguageScreenController>;
}) {
  const { locale, setLocale, saving, save, router } = model;
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </Pressable>
        <AppText variant="h4" weight="bold">
          Message language
        </AppText>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.intro}>
        <Languages size={28} color={Colors.cta} />
        <AppText variant="body" color={Colors.textSecondary}>
          Choose the language used for automatic chat translations.
        </AppText>
      </View>
      <View style={styles.card}>
        {OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={styles.option}
            onPress={() => setLocale(option.value)}
          >
            <AppText variant="body" weight="semiBold">
              {option.label}
            </AppText>
            {locale === option.value && <Check size={20} color={Colors.cta} />}
          </Pressable>
        ))}
      </View>
      <AppButton
        label={saving ? 'Saving…' : 'Save language'}
        fullWidth
        disabled={saving}
        onPress={() => void save()}
      />
    </View>
  );
}
