import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Check,
  Wrench,
  Briefcase,
  Award,
  Plus,
} from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { Spacing, theme } from '@/constants/theme';
import { getBackRoute } from '@/constants/backRoutes';
import { useGoBack } from '@/hooks/useGoBack';
import {
  fetchMyWorkerSkillsAndIndustry,
  updateMyWorkerSkillsAndIndustry,
  type IndustryWithSkills,
} from '@/services/api';

const YEARS_OPTIONS = [1, 2, 3, 5, 8, 10];

export default function WorkerIndustrySkillsScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const goBack = useGoBack('/(worker)/profile');
  const handleBack = () => {
    const route = getBackRoute(from);
    if (route) router.push(route);
    else goBack();
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [industries, setIndustries] = useState<IndustryWithSkills[]>([]);
  const [industry, setIndustry] = useState('');
  const [isEditingIndustry, setIsEditingIndustry] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState<number>(3);
  const [rateBySkillId, setRateBySkillId] = useState<
    Record<string, number | null>
  >({});
  const [saving, setSaving] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState<{
    industry: string;
    skills: string;
    years: number;
    rates: string;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');
      void fetchMyWorkerSkillsAndIndustry()
        .then((res) => {
          if (!active) return;
          if (res.error) {
            setError(res.error);
            return;
          }

          setIndustries(res.data.industries);
          const nextIndustry =
            res.data.primaryIndustryId ?? res.data.selectedIndustryIds[0] ?? '';
          const industrySkillIds = new Set(
            res.data.industries
              .find((item) => item.id === nextIndustry)
              ?.skills.map((skill) => skill.id) ?? [],
          );
          const compatibleSkillIds = res.data.selectedSkillIds.filter(
            (skillId) => industrySkillIds.has(skillId),
          );
          const nextRateBySkillId = Object.fromEntries(
            Object.entries(res.data.rateBySkillId).filter(([skillId]) =>
              compatibleSkillIds.includes(skillId),
            ),
          );
          const nextYearsExperience = res.data.yearsExperience || 3;
          setIndustry(nextIndustry);
          setSelectedSkillIds(compatibleSkillIds);
          setYearsExperience(nextYearsExperience);
          setRateBySkillId(nextRateBySkillId);
          setInitialSnapshot({
            industry: nextIndustry,
            skills: JSON.stringify([...compatibleSkillIds].sort()),
            years: nextYearsExperience,
            rates: JSON.stringify(Object.entries(nextRateBySkillId).sort()),
          });
        })
        .catch((err) => {
          if (active)
            setError(
              err instanceof Error ? err.message : 'Unable to load skills',
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, []),
  );

  const currentIndustry = industries.find((item) => item.id === industry);
  const availableSkills = currentIndustry?.skills ?? [];

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId],
    );
  };

  const handleSelectIndustry = (industryId: string) => {
    setIndustry(industryId);
    setSelectedSkillIds([]);
    setRateBySkillId({});
    setIsEditingIndustry(false);
  };

  const hasChanges =
    initialSnapshot != null &&
    (industry !== initialSnapshot.industry ||
      JSON.stringify([...selectedSkillIds].sort()) !== initialSnapshot.skills ||
      yearsExperience !== initialSnapshot.years ||
      JSON.stringify(Object.entries(rateBySkillId).sort()) !==
        initialSnapshot.rates);

  const handleSave = async () => {
    if (!industry) {
      Alert.alert('Industry required', 'Select your primary industry.');
      return;
    }
    if (!selectedSkillIds.length) {
      Alert.alert('Skills required', 'Select at least one service skill.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await updateMyWorkerSkillsAndIndustry({
        selectedIndustryIds: [industry],
        selectedSkillIds,
        yearsExperience,
        rateBySkillId,
      });
      if (result.error) throw new Error(result.error);
      setShowSaveConfirmation(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update industry and skills',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen safeArea backgroundColor={theme.colors.background}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[theme.typography.body2, { marginTop: theme.spacing.md }]}
          >
            Loading industry & skills taxonomy...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scrollable
      keyboardAvoiding={false}
      contentContainerStyle={{ paddingBottom: 80 }}
      style={{ paddingBottom: 0 }}
    >
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={12}>
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="h3" weight="bold">
          Industry & Skills
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {error ? (
          <View style={styles.errorCard}>
            <Text style={{ color: theme.colors.error, fontSize: 14 }}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Section 1: Primary Industry */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Briefcase size={20} color={theme.colors.primary} />
            <Text
              style={[theme.typography.h4, { marginLeft: theme.spacing.sm }]}
            >
              Primary Industry
            </Text>
          </View>

          {!isEditingIndustry ? (
            <Pressable
              style={styles.selectedCard}
              onPress={() => setIsEditingIndustry(true)}
            >
              <View style={styles.selectedCardContent}>
                <Wrench size={18} color={theme.colors.surface} />
                <Text style={styles.selectedCardText}>
                  {currentIndustry?.name ?? 'Select your primary industry'}
                </Text>
              </View>
              <Text style={styles.selectedCardHint}>Tap to change</Text>
            </Pressable>
          ) : (
            <View style={styles.editSection}>
              <Text style={styles.editHint}>Select your primary trade:</Text>
              <View style={styles.industryGrid}>
                {industries.map((ind) => {
                  const isSelected = industry === ind.id;
                  return (
                    <Pressable
                      key={ind.id}
                      style={[
                        styles.industryChip,
                        isSelected && styles.industryChipActive,
                      ]}
                      onPress={() => handleSelectIndustry(ind.id)}
                    >
                      <Text
                        style={[
                          styles.industryChipText,
                          isSelected && styles.industryChipTextActive,
                        ]}
                      >
                        {ind.name}
                      </Text>
                      {isSelected && (
                        <Check
                          size={16}
                          color={theme.colors.surface}
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
              <AppButton
                label="Cancel"
                variant="ghost"
                size="sm"
                onPress={() => {
                  setIsEditingIndustry(false);
                  setIndustry(initialSnapshot?.industry ?? '');
                }}
              />
            </View>
          )}
        </View>

        {/* Section 2: Skills & Services */}
        <View style={styles.skillCard}>
          <View style={styles.sectionTitleRow}>
            <Wrench size={20} color={theme.colors.primary} />
            <Text
              style={[theme.typography.h4, { marginLeft: theme.spacing.sm }]}
            >
              {currentIndustry?.name ? `${currentIndustry.name} ` : ''}
              Skills & Services
            </Text>
          </View>
          <Text style={styles.skillCardHint}>
            Check all specific services you are qualified to perform:
          </Text>

          <View style={styles.skillsList}>
            {availableSkills.map((skill) => {
              const isChecked = selectedSkillIds.includes(skill.id);
              return (
                <View key={skill.id} style={styles.skillBlock}>
                  <Pressable
                    style={[
                      styles.skillRow,
                      isChecked && styles.skillRowChecked,
                    ]}
                    onPress={() => toggleSkill(skill.id)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isChecked && styles.checkboxChecked,
                      ]}
                    >
                      {isChecked && (
                        <Check size={14} color={theme.colors.surface} />
                      )}
                    </View>
                    <Text
                      style={[
                        theme.typography.body2,
                        { fontWeight: isChecked ? '700' : '400' },
                      ]}
                    >
                      {skill.name}
                    </Text>
                  </Pressable>
                  {isChecked ? (
                    <AppInput
                      label="Your service rate (PHP/₱)"
                      accessibilityLabel={`${skill.name} service rate in PHP`}
                      placeholder="Set rate to match this service"
                      keyboardType="decimal-pad"
                      leftIcon={<Text style={styles.currencyPrefix}>₱</Text>}
                      value={
                        rateBySkillId[skill.id] == null
                          ? ''
                          : String(rateBySkillId[skill.id]! / 100)
                      }
                      onChangeText={(value) => {
                        const normalized = value.replace(/[^0-9.]/g, '');
                        const amount = Number(normalized);
                        setRateBySkillId((current) => ({
                          ...current,
                          [skill.id]:
                            normalized && Number.isFinite(amount)
                              ? Math.round(amount * 100)
                              : null,
                        }));
                      }}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>

          {!showAddSkill ? (
            <Pressable
              style={styles.addSkillBtn}
              onPress={() => setShowAddSkill(true)}
            >
              <Plus size={18} color={theme.colors.primary} />
              <Text style={styles.addSkillBtnText}>Add custom skill</Text>
            </Pressable>
          ) : (
            <View style={styles.addSkillForm}>
              <TextInput
                style={[styles.addSkillInput, styles.addSkillInputDisabled]}
                placeholder="Custom skills are not available yet"
                placeholderTextColor={theme.colors.textTertiary}
                editable={false}
              />
              <Pressable
                style={styles.addSkillCancel}
                onPress={() => setShowAddSkill(false)}
              >
                <Text
                  style={[
                    theme.typography.body2,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Section 3: Years of Experience */}
        <View style={styles.skillCard}>
          <View style={styles.sectionTitleRow}>
            <Award size={20} color={theme.colors.primary} />
            <Text
              style={[theme.typography.h4, { marginLeft: theme.spacing.sm }]}
            >
              Years of Experience
            </Text>
          </View>
          <View style={styles.yearsRow}>
            {YEARS_OPTIONS.map((years) => (
              <Pressable
                key={years}
                style={[
                  styles.yearBadge,
                  yearsExperience === years && styles.yearBadgeActive,
                ]}
                onPress={() => setYearsExperience(years)}
              >
                <Text
                  style={[
                    styles.yearBadgeText,
                    yearsExperience === years && styles.yearBadgeTextActive,
                  ]}
                >
                  {years} {years === 1 ? 'yr' : 'yrs'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <AppButton
          label="Save Changes"
          variant="primary"
          fullWidth
          disabled={!hasChanges}
          loading={saving}
          onPress={() => void handleSave()}
        />
      </View>

      <Modal
        visible={showSaveConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSaveConfirmation(false)}
      >
        <View style={styles.confirmationOverlay}>
          <View
            style={styles.confirmationDialog}
            accessibilityRole="alert"
            accessibilityViewIsModal
          >
            <View style={styles.confirmationIcon}>
              <Check size={28} color={theme.colors.surface} />
            </View>
            <Text style={[theme.typography.h3, styles.confirmationTitle]}>
              Industry & Skills Saved!
            </Text>
            <Text
              style={[theme.typography.body2, styles.confirmationDescription]}
            >
              Your skills and worker-set rates are now used for matching and
              pricing.
            </Text>
            <AppButton
              label="OK"
              variant="primary"
              fullWidth
              onPress={() => {
                setShowSaveConfirmation(false);
                router.replace('/(worker)/profile');
              }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing['3'],
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSpacer: { width: 40 },
  content: {
    flex: 1,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.xl,
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedCardText: {
    color: theme.colors.surface,
    fontWeight: '600',
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: 16,
  },
  selectedCardHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  editSection: {
    gap: theme.spacing.sm,
  },
  editHint: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: theme.spacing.sm,
  },
  industryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  industryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  industryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  industryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  industryChipTextActive: {
    color: theme.colors.surface,
  },
  skillCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  skillCardHint: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  skillsList: {
    gap: theme.spacing.sm,
  },
  skillBlock: {
    gap: theme.spacing.sm,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.md,
  },
  skillRowChecked: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}0D`,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  currencyPrefix: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
  },
  addSkillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  addSkillBtnText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  addSkillForm: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  addSkillInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addSkillInputDisabled: {
    backgroundColor: theme.colors.borderLight,
    color: theme.colors.textTertiary,
  },
  addSkillCancel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  yearsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  yearBadge: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  yearBadgeActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  yearBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  yearBadgeTextActive: {
    color: theme.colors.surface,
  },
  confirmationOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.layout.screenPadding,
    backgroundColor: theme.colors.overlay,
  },
  confirmationDialog: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.lg,
  },
  confirmationIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.success,
  },
  confirmationTitle: {
    textAlign: 'center',
    color: theme.colors.textPrimary,
  },
  confirmationDescription: {
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
});
