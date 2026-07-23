import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Wrench, Briefcase, Award } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/AppButton';
import { theme } from '@/constants/theme';
import {
  fetchMyWorkerSkillsAndIndustry,
  type IndustryWithSkills,
} from '@/services/api';

export default function WorkerIndustrySkillsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [industries, setIndustries] = useState<IndustryWithSkills[]>([]);
  const [selectedIndustryId, setSelectedIndustryId] = useState<string | null>(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState<number>(3);

  useEffect(() => {
    let active = true;
    void fetchMyWorkerSkillsAndIndustry()
      .then((res) => {
        if (!active) return;
        if (res.error) {
          setError(res.error);
        } else {
          setIndustries(res.data.industries);
          setSelectedIndustryId(
            res.data.primaryIndustryId || res.data.industries[0]?.id || null,
          );
          setSelectedSkillIds(res.data.selectedSkillIds || []);
          setYearsExperience(res.data.yearsExperience || 3);
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load skills');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId],
    );
  };

  const currentIndustry = industries.find((i) => i.id === selectedIndustryId);

  const handleSave = () => {
    Alert.alert(
      'Preview only',
      'Industry and skills are currently visual-only and are not used for matching.',
    );
    return;
    /*
      Alert.alert(
        'Industry & Skills Saved! ✅',
        'Your profile industry and skills have been updated in the database.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(worker)/profile' as any),
          },
        ],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update industry & skills');
    }
    */
  };

  if (loading) {
    return (
      <Screen safeArea backgroundColor={theme.colors.background}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[theme.typography.body2, { marginTop: theme.spacing.md }]}>
            Loading industry & skills taxonomy...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
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

        {/* Section 1: Primary Industry */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Briefcase size={20} color={theme.colors.primary} />
            <Text style={theme.typography.h4}>Primary Industry</Text>
          </View>
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
            ]}
          >
            Select your main line of work or trade category:
          </Text>

          <View style={styles.industryGrid}>
            {industries.map((ind) => {
              const isSelected = selectedIndustryId === ind.id;
              return (
                <Pressable
                  key={ind.id}
                  style={[
                    styles.industryChip,
                    isSelected && styles.industryChipActive,
                  ]}
                  onPress={() => {
                    setSelectedIndustryId(ind.id);
                    // Automatically add skills from this industry if none selected
                    const skillIdsInInd = ind.skills.map((s) => s.id);
                    if (skillIdsInInd.length > 0 && selectedSkillIds.length === 0) {
                      setSelectedSkillIds(skillIdsInInd.slice(0, 2));
                    }
                  }}
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
                    <Check size={16} color={theme.colors.surface} style={{ marginLeft: 4 }} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section 2: Skills & Services */}
        {currentIndustry && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Wrench size={20} color={theme.colors.primary} />
              <Text style={theme.typography.h4}>
                {currentIndustry.name} Skills & Services
              </Text>
            </View>
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
              ]}
            >
              Check all specific services you are qualified to perform:
            </Text>

            <View style={styles.skillsList}>
              {currentIndustry.skills.map((skill) => {
                const isChecked = selectedSkillIds.includes(skill.id);
                return (
                  <Pressable
                    key={skill.id}
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
                      {isChecked && <Check size={14} color={theme.colors.surface} />}
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
                );
              })}
            </View>
          </View>
        )}

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
          onPress={handleSave}
        />
      </View>
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
    paddingHorizontal: theme.layout.screenPadding,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: { flex: 1 },
  contentInner: {
    padding: theme.layout.screenPadding,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.lg,
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
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
  skillsList: {
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
  footer: {
    padding: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
});
