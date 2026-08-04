import {
  getMyProfile,
  setPreferredLocale,
} from '../logic/SettingsLanguageScreenLogic';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

export function useSettingsLanguageScreenController() {
  const [locale, setLocale] = useState<'en' | 'fil'>('en');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    void getMyProfile().then((profile) => {
      if (active && profile.role !== 'ADMIN') setLocale(profile.preferredLocale);
    });
    return () => {
      active = false;
    };
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
  return { locale, setLocale, saving, save, router };
}
