import { styles } from './WorkerIndustrySkillsScreen.styles';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  Wrench,
  Briefcase,
  Award,
} from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { theme } from '@/constants/theme';
import type { useWorkerIndustrySkillsScreenController } from '../hooks/useWorkerIndustrySkillsScreenController';

export function WorkerIndustrySkillsView({
  model,
}: {
  model: ReturnType<typeof useWorkerIndustrySkillsScreenController>;
}) {
  const {
    router,
    loading,
    error,
    industries,
    selectedIndustryIds,
    selectedSkillIds,
    yearsExperience,
    setYearsExperience,
    rateBySkillId,
    setRateBySkillId,
    saving,
    showSaveConfirmation,
    setShowSaveConfirmation,
    toggleSkill,
    selectedIndustries,
    toggleIndustry,
    handleSave,
  } = model;
  return loading ? (
    <Screen safeArea backgroundColor={theme.colors.background}>
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[theme.typography.body2, { marginTop: theme.spacing.md }]}>
          Loading industry & skills taxonomy...
        </Text>
      </View>
    </Screen>
  ) : (
    <Screen safeArea backgroundColor={theme.colors.background}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={theme.typography.h3}>Industry & Skills</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorCard}>
            <Text style={{ color: theme.colors.error, fontSize: 14 }}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Section 1: Primary Industries */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Briefcase size={20} color={theme.colors.primary} />
            <Text style={theme.typography.h4}>Primary Industries</Text>
          </View>
          <Text
            style={[
              theme.typography.caption,
              {
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing.md,
              },
            ]}
          >
            Select one or more work or trade categories:
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
        </View>

        {/* Section 2: Skills & Services */}
        {selectedIndustries.map((industry) => (
          <View key={industry.id} style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Wrench size={20} color={theme.colors.primary} />
              <Text style={theme.typography.h4}>
                {industry.name} Skills & Services
              </Text>
            </View>
            <Text
              style={[
                theme.typography.caption,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.md,
                },
              ]}
            >
              Check all specific services you are qualified to perform:
            </Text>

            <View style={styles.skillsList}>
              {industry.skills.map((skill) => {
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
          </View>
        ))}

        {/* Section 3: Years of Experience */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Award size={20} color={theme.colors.primary} />
            <Text style={theme.typography.h4}>Years of Experience</Text>
          </View>
          <View style={styles.yearsRow}>
            {[1, 2, 3, 5, 8, 10].map((years) => (
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
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label="Save Industry & Skills"
          variant="primary"
          fullWidth
          onPress={() => void handleSave()}
          loading={saving}
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
