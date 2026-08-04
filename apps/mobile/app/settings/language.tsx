import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Check, ChevronLeft, Languages } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getMyProfile } from '@/services/profile';
import { setPreferredLocale } from '@/services/api';

const OPTIONS = [
  { value: 'en' as const, label: 'English' },
  { value: 'fil' as const, label: 'Filipino' },
];

export default function LanguageSettingsScreen() {
  const [locale, setLocale] = useState<'en' | 'fil'>('en');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void getMyProfile().then((profile) => {
      if (profile.role !== 'ADMIN') setLocale(profile.preferredLocale);
    });
  }, []);
  const save = async () => {
    setSaving(true);
    try {
      await setPreferredLocale(locale);
      Alert.alert(
        'Language updated',
        'New messages will be translated to your selected language.',
      );
      router.back();
    } catch (error) {
      Alert.alert(
        'Unable to save',
        error instanceof Error ? error.message : 'Please retry.',
      );
    } finally {
      setSaving(false);
    }
  };
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing['4'],
    paddingTop: Spacing['14'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing['6'],
  },
  intro: { gap: Spacing['3'], marginBottom: Spacing['5'] },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing['6'],
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing['4'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
});
