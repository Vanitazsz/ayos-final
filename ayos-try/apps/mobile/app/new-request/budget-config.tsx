import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import { ArrowLeft, Wallet } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRequestStore } from '@/store/useRequestStore';

const BUDGET_PRESETS = [
  { id: '1', label: '₱ 0 - 500', min: '0', max: '500' },
  { id: '2', label: '₱ 500 - 1,500', min: '500', max: '1500' },
  { id: '3', label: '₱ 1,500 - 3,000', min: '1500', max: '3000' },
  { id: '4', label: '₱ 3,000+', min: '3000', max: '10000' },
];

export default function BudgetConfigScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setDraft = useRequestStore((state) => state.setDraft);
  
  const [activePreset, setActivePreset] = useState<string | null>('2');
  const [minBudget, setMinBudget] = useState('500');
  const [maxBudget, setMaxBudget] = useState('1500');

  const handlePresetSelect = (preset: any) => {
    setActivePreset(preset.id);
    setMinBudget(preset.min);
    setMaxBudget(preset.max);
  };

  const handleCustomInput = () => {
    setActivePreset(null);
  };

  const handleSave = () => {
    const minimum = Math.round(Number(minBudget) * 100);
    const maximum = Math.round(Number(maxBudget) * 100);
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum < 0 || maximum < minimum) return;
    setDraft({ budgetMinor: maximum });
    router.back();
  };

  return (
    <Screen safeArea backgroundColor={theme.colors.background}>
      <View style={[styles.header, { paddingHorizontal: theme.layout.screenPadding }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={[theme.typography.h4, { color: theme.colors.textPrimary }]}>Budget Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <View style={styles.illustrationContainer}>
          <View style={styles.iconCircle}>
            <Wallet color={theme.colors.primary} size={48} />
          </View>
          <Text style={[theme.typography.h2, { textAlign: 'center', marginTop: theme.spacing.lg }]}>How much can you afford?</Text>
          <Text style={[theme.typography.body2, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.sm, paddingHorizontal: theme.spacing.xl }]}>
            Set a price range so we can recommend workers that fit your budget perfectly.
          </Text>
        </View>

        <View style={styles.configCard}>
          <Text style={[theme.typography.label, { marginBottom: theme.spacing.md }]}>Quick Select</Text>
          <View style={styles.presetGrid}>
            {BUDGET_PRESETS.map((preset) => (
              <TouchableOpacity 
                key={preset.id}
                style={[styles.presetBtn, activePreset === preset.id && styles.presetBtnActive]}
                onPress={() => handlePresetSelect(preset)}
              >
                <Text style={[theme.typography.body2, { color: activePreset === preset.id ? theme.colors.surface : theme.colors.textPrimary, fontWeight: activePreset === preset.id ? '600' : '400' }]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[theme.typography.label, { marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }]}>Custom Range (₱)</Text>
          <View style={styles.customRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₱</Text>
              <TextInput 
                style={styles.input}
                keyboardType="numeric"
                value={minBudget}
                onChangeText={(val) => { setMinBudget(val); handleCustomInput(); }}
                placeholder="Min"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
            <Text style={{ marginHorizontal: theme.spacing.md, color: theme.colors.textSecondary }}>to</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₱</Text>
              <TextInput 
                style={styles.input}
                keyboardType="numeric"
                value={maxBudget}
                onChangeText={(val) => { setMaxBudget(val); handleCustomInput(); }}
                placeholder="Max"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button 
          title="Save Budget" 
          onPress={handleSave} 
          disabled={!minBudget || !maxBudget}
          fullWidth 
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.md },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  content: { flex: 1, paddingHorizontal: theme.layout.screenPadding, justifyContent: 'center' },
  
  illustrationContainer: { alignItems: 'center', paddingVertical: theme.spacing.xl, marginBottom: theme.spacing.md },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: theme.colors.infoBackground, justifyContent: 'center', alignItems: 'center' },
  
  configCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, padding: theme.spacing.lg, ...theme.shadows.sm, marginBottom: theme.spacing.xxl },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  presetBtn: { width: '48%', paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.sm, backgroundColor: theme.colors.background, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.borderLight, alignItems: 'center', marginBottom: theme.spacing.md },
  presetBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  
  customRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.borderLight, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, height: 50 },
  currencySymbol: { fontSize: 16, color: theme.colors.textSecondary, marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: theme.colors.textPrimary, padding: 0 },

  footer: { paddingVertical: theme.spacing.md, paddingHorizontal: theme.layout.screenPadding, backgroundColor: theme.colors.background },
});
