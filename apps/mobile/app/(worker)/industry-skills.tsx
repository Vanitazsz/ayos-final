import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import { ArrowLeft, Check, Wrench } from 'lucide-react-native';
import {
  fetchIndustriesWithCategories,
  getWorkerIndustryReadiness,
  saveWorkerIndustrySkillSelection,
} from '@/services/api';
import { showAlert } from '@/components/AppAlert';

export default function WorkerIndustrySkillsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [industries, setIndustries] = useState<any[]>([]);
  const [selectedIndustryIds, setSelectedIndustryIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [indData, readiness] = await Promise.all([
          fetchIndustriesWithCategories(),
          getWorkerIndustryReadiness(),
        ]);
        setIndustries(indData || []);
        setSelectedIndustryIds(readiness.selectedIndustryIds || []);
        setSelectedCategoryIds(readiness.selectedCategoryIds || []);
      } catch (err) {
        showAlert('Error', 'Failed to load industry skills.');
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  const toggleIndustry = (id: string) => {
    setSelectedIndustryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    if (selectedIndustryIds.length === 0) {
      showAlert('Selection Required', 'Please select at least one industry.');
      return;
    }
    if (selectedCategoryIds.length === 0) {
      showAlert('Selection Required', 'Please select at least one service skill.');
      return;
    }
    setSaving(true);
    try {
      await saveWorkerIndustrySkillSelection({
        selectedIndustryIds,
        selectedCategoryIds,
      });
      showAlert('Success', 'Industry and skills updated successfully.');
      router.back();
    } catch (err: any) {
      showAlert('Error', err?.message || 'Failed to save industry skills.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    <Screen safeArea backgroundColor={theme.colors.background}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    </Screen>;
  }

  return (
    <Screen safeArea scrollable backgroundColor={theme.colors.background}>
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.layout.screenPadding },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Industry & Skills</Text>
        <View style={{ width: 40 }} />
      </View>

      <View
        style={[
          styles.content,
          { paddingHorizontal: theme.layout.screenPadding },
        ]}
      >
        <Text style={styles.subtitle}>
          Select your primary industries and the skills/services you provide to
          receive relevant service requests.
        </Text>

        {industries.map((industry) => {
          const isIndustrySelected = selectedIndustryIds.includes(industry.id);
          return (
            <View key={industry.id} style={styles.industryCard}>
              <TouchableOpacity
                style={[
                  styles.industryHeader,
                  isIndustrySelected && styles.industryHeaderSelected,
                ]}
                onPress={() => toggleIndustry(industry.id)}
                activeOpacity={0.7}
              >
                <View style={styles.row}>
                  <Wrench
                    color={
                      isIndustrySelected
                        ? theme.colors.primary
                        : theme.colors.textSecondary
                    }
                    size={20}
                  />
                  <Text
                    style={[
                      styles.industryName,
                      isIndustrySelected && styles.industryNameSelected,
                    ]}
                  >
                    {industry.name}
                  </Text>
                </View>
                {isIndustrySelected && (
                  <Check color={theme.colors.primary} size={20} />
                )}
              </TouchableOpacity>

              {isIndustrySelected && (
                <View style={styles.categoriesWrap}>
                  {(industry.service_categories || []).map((cat: any) => {
                    const isCatSelected = selectedCategoryIds.includes(cat.id);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.chip,
                          isCatSelected && styles.chipSelected,
                        ]}
                        onPress={() => toggleCategory(cat.id)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isCatSelected && styles.chipTextSelected,
                          ]}
                        >
                          {cat.name}
                        </Text>
                        {isCatSelected && (
                          <Check color={theme.colors.primary} size={14} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.footer}>
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingVertical: theme.spacing.md,
  },
  subtitle: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  industryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  industryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  industryHeaderSelected: {
    backgroundColor: theme.colors.infoBackground,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  industryName: {
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
  },
  industryNameSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    gap: 4,
  },
  chipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.infoBackground,
  },
  chipText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  chipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
});
