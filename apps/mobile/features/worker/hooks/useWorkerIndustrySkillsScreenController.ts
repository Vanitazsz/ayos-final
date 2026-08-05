import { useState } from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { getBackRoute } from '@/constants/backRoutes';
import { updateMyWorkerSkillsAndIndustry } from '../logic/WorkerIndustrySkillsScreenLogic';
import { useWorkerSkills } from '@/features/worker/hooks/useWorkerSkills';
import { showAlert } from '@/components/AppAlert';

export function useWorkerIndustrySkillsScreenController() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBack = () => {
    const route = getBackRoute(from);
    if (route) router.push(route);
    else router.back();
  };
  const {
    industries,
    selectedIndustryIds,
    toggleIndustry,
    selectedSkillIds,
    setSelectedSkillIds,
    yearsExperience,
    setYearsExperience,
    rateBySkillId,
    setRateBySkillId,
    initialSnapshot,
    loading,
    error,
    setError,
  } = useWorkerSkills();
  const [saving, setSaving] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  const selectedIndustries = industries.filter((item) =>
    selectedIndustryIds.includes(item.id),
  );

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId],
    );
  };

  const hasChanges =
    initialSnapshot != null &&
    (JSON.stringify([...selectedIndustryIds].sort()) !==
      initialSnapshot.industries ||
      JSON.stringify([...selectedSkillIds].sort()) !== initialSnapshot.skills ||
      yearsExperience !== initialSnapshot.years ||
      JSON.stringify(Object.entries(rateBySkillId).sort()) !==
        initialSnapshot.rates);

  const handleSave = async () => {
    if (!selectedIndustryIds.length) {
      showAlert('Industry required', 'Select at least one industry.');
      return;
    }
    if (!selectedSkillIds.length) {
      showAlert('Skills required', 'Select at least one service skill.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await updateMyWorkerSkillsAndIndustry({
        selectedIndustryIds,
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

  return {
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
  };
}
