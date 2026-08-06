import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  Wrench,
  Briefcase,
  Award,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { theme } from '@/constants/theme';
import { styles } from './WorkerIndustrySkillsScreen.styles';
import type { useWorkerIndustrySkillsScreenController } from '../hooks/useWorkerIndustrySkillsScreenController';

const YEARS_OPTIONS = [1, 2, 3, 5, 8, 10];

export function IndustrySkillsView({
  model,
}: {
  model: ReturnType<typeof useWorkerIndustrySkillsScreenController>;
}) {
  const {
    router,
    handleBack,
    industries,
    selectedIndustryIds,
    toggleIndustry,
    selectedSkillIds,
    yearsExperience,
    setYearsExperience,
    rateBySkillId,
    setRateBySkillId,
    loading,
    error,
    saving,
    showSaveConfirmation,
    setShowSaveConfirmation,
    selectedIndustries,
    toggleSkill,
    hasChanges,
    handleSave,
    rateErrorSkillIds,
    setRateErrorSkillIds,
    reload,
  } = model;

  const [expandedIndustryIds, setExpandedIndustryIds] = useState<string[]>([]);

  useEffect(() => {
    setExpandedIndustryIds((current) => {
      const next = new Set(current);
      let changed = false;
      for (const id of selectedIndustryIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      for (const id of current) {
        if (!selectedIndustryIds.includes(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? [...next] : current;
    });
  }, [selectedIndustryIds]);

  const toggleExpanded = (industryId: string) => {
    setExpandedIndustryIds((current) =>
      current.includes(industryId)
        ? current.filter((id) => id !== industryId)
        : [...current, industryId],
    );
  };

  const handleRateChange = (skillId: string, value: string) => {
    const normalized = value.replace(/[^0-9.]/g, '');
    const amount = Number(normalized);
    setRateBySkillId((current) => ({
      ...current,
      [skillId]:
        normalized && Number.isFinite(amount) ? Math.round(amount * 100) : null,
    }));
    if (rateErrorSkillIds.includes(skillId)) {
      setRateErrorSkillIds((current) =>
        current.filter((id) => id !== skillId),
      );
    }
  };

  if (loading) {
    return (
      <Screen safeArea backgroundColor={theme.colors.background} style={{ paddingBottom: 0 }}>
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

  const selectedCount = selectedIndustryIds.length;
  const missingRateIds = selectedSkillIds.filter(
    (skillId) => !rateBySkillId[skillId] || rateBySkillId[skillId]! <= 0,
  );

  return (
    <Screen
      safeArea
      keyboardAvoiding={false}
      backgroundColor={theme.colors.background}
      style={{ paddingBottom: 0 }}
    >
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={12}>
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="h3" weight="bold" style={styles.headerTitle}>
          Industry & Skills
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {industries.length > 0 ? (
          <View style={styles.progressCard}>
            <Text style={styles.progressText}>
              Industries{' '}
              <Text style={styles.progressStrong}>{selectedCount}</Text>
              <Text style={styles.progressDim}> · </Text>
              Skills{' '}
              <Text style={styles.progressStrong}>{selectedSkillIds.length}</Text>
              <Text style={styles.progressDim}> · </Text>
              {yearsExperience} {yearsExperience === 1 ? 'yr' : 'yrs'}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <AppButton
              label="Try Again"
              variant="outline"
              size="sm"
              onPress={reload}
              style={styles.retryBtn}
            />
          </View>
        ) : null}

        {industries.length === 0 && !error ? (
          <View style={styles.emptyCard}>
            <Info size={28} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No industries available</Text>
            <Text style={styles.emptyDescription}>
              We could not find any industries to choose from.
            </Text>
            <AppButton
              label="Reload"
              variant="outline"
              size="sm"
              onPress={reload}
            />
          </View>
        ) : null}

        {industries.length > 0 ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Briefcase size={20} color={theme.colors.primary} />
              <Text
                style={[theme.typography.h4, { marginLeft: theme.spacing.sm }]}
              >
                Primary Industries
              </Text>
            </View>
            <Text style={styles.sectionHint}>
              Pick one or more industries you work in. Your skills will follow.
            </Text>

            <View style={styles.industryGrid}>
              {industries.map((ind) => {
                const isSelected = selectedIndustryIds.includes(ind.id);
                return (
                  <Pressable
                    key={ind.id}
                    style={[
                      styles.industryChip,
                      isSelected && styles.industryChipActive,
                    ]}
                    onPress={() => toggleIndustry(ind.id)}
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

            {selectedCount === 0 ? (
              <View style={styles.inlineHint}>
                <Info size={14} color={theme.colors.textTertiary} />
                <Text style={styles.inlineHintText}>
                  Select an industry above to set your skills and rates.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {selectedIndustries.length > 0 ? (
          <View style={styles.skillsSection}>
            {selectedIndustries.map((industry) => {
              const isExpanded = expandedIndustryIds.includes(industry.id);
              const industrySkillCount = industry.skills.filter((skill) =>
                selectedSkillIds.includes(skill.id),
              ).length;
              return (
                <View key={industry.id} style={styles.skillCard}>
                  <Pressable
                    style={styles.accordionHeader}
                    onPress={() => toggleExpanded(industry.id)}
                    hitSlop={8}
                  >
                    <View style={styles.accordionTitleRow}>
                      <Wrench size={20} color={theme.colors.primary} />
                      <Text
                        style={[theme.typography.h4, styles.accordionTitle]}
                      >
                        {industry.name}
                      </Text>
                      {industrySkillCount > 0 ? (
                        <View style={styles.countBadge}>
                          <Text style={styles.countBadgeText}>
                            {industrySkillCount}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {isExpanded ? (
                      <ChevronUp
                        size={20}
                        color={theme.colors.textTertiary}
                      />
                    ) : (
                      <ChevronDown
                        size={20}
                        color={theme.colors.textTertiary}
                      />
                    )}
                  </Pressable>

                  {isExpanded ? (
                    <View style={styles.skillCardBody}>
                      <Text style={styles.skillCardHint}>
                        Check each service you offer, then set your rate.
                      </Text>
                      <View style={styles.skillsList}>
                        {industry.skills.map((skill) => {
                          const isChecked = selectedSkillIds.includes(skill.id);
                          const hasRateError =
                            isChecked && rateErrorSkillIds.includes(skill.id);
                          return (
                            <View key={skill.id} style={styles.skillBlock}>
                              <Pressable
                                style={[
                                  styles.skillRow,
                                  isChecked && styles.skillRowChecked,
                                  hasRateError && styles.skillRowError,
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
                                    <Check
                                      size={14}
                                      color={theme.colors.surface}
                                    />
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
                                <View style={styles.rateWrap}>
                                  <AppInput
                                    label="Service rate (₱)"
                                    accessibilityLabel={`${skill.name} service rate in PHP`}
                                    placeholder="0.00"
                                    keyboardType="decimal-pad"
                                    leftIcon={
                                      <Text style={styles.currencyPrefix}>
                                        ₱
                                      </Text>
                                    }
                                    value={
                                      rateBySkillId[skill.id] == null
                                        ? ''
                                        : String(rateBySkillId[skill.id]! / 100)
                                    }
                                    onChangeText={(value) =>
                                      handleRateChange(skill.id, value)
                                    }
                                    containerStyle={styles.rateInput}
                                    error={
                                      hasRateError
                                        ? 'Rate required (₱0+)'
                                        : undefined
                                    }
                                  />
                                  <Text style={styles.rateHelper}>
                                    Set the price you charge for this service.
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.skillCard}>
          <View style={styles.sectionTitleRow}>
            <Award size={20} color={theme.colors.primary} />
            <Text
              style={[theme.typography.h4, { marginLeft: theme.spacing.sm }]}
            >
              Years of Experience
            </Text>
          </View>
          <Text style={styles.sectionHint}>
            Total years you have worked in your trades.
          </Text>
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

        {selectedCount > 0 ? (
          <View style={styles.reviewCard}>
            <View style={styles.sectionTitleRow}>
              <Check size={18} color={theme.colors.success} />
              <Text style={[theme.typography.h4, styles.reviewTitle]}>
                Review
              </Text>
            </View>
            <View style={styles.reviewList}>
              {selectedIndustries.map((industry) => {
                const industrySkillCount = industry.skills.filter((skill) =>
                  selectedSkillIds.includes(skill.id),
                ).length;
                return (
                  <View key={industry.id} style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>{industry.name}</Text>
                    <Text style={styles.reviewValue}>
                      {industrySkillCount}{' '}
                      {industrySkillCount === 1 ? 'skill' : 'skills'}
                    </Text>
                  </View>
                );
              })}
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Experience</Text>
                <Text style={styles.reviewValue}>
                  {yearsExperience} {yearsExperience === 1 ? 'yr' : 'yrs'}
                </Text>
              </View>
              {missingRateIds.length > 0 ? (
                <Text style={styles.reviewWarning}>
                  {missingRateIds.length}{' '}
                  {missingRateIds.length === 1
                    ? 'service is'
                    : 'services are'}{' '}
                  missing a rate.
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.saveBar}>
          <AppButton
            label="Save Changes"
            variant="primary"
            fullWidth
            disabled={!hasChanges}
            loading={saving}
            onPress={() => void handleSave()}
          />
        </View>
      </ScrollView>

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
              {selectedCount}{' '}
              {selectedCount === 1 ? 'industry' : 'industries'} ·{' '}
              {selectedSkillIds.length}{' '}
              {selectedSkillIds.length === 1 ? 'skill' : 'skills'} ·{' '}
              {yearsExperience} {yearsExperience === 1 ? 'yr' : 'yrs'}
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
