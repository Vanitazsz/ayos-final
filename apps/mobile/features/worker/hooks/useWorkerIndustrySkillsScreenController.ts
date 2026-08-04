import {
  fetchMyWorkerSkillsAndIndustry,
  updateMyWorkerSkillsAndIndustry,
  filterCompatibleSkills,
  type IndustryWithSkills,
} from '../logic/WorkerIndustrySkillsScreenLogic';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

export function useWorkerIndustrySkillsScreenController() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [industries, setIndustries] = useState<IndustryWithSkills[]>([]);
  const [selectedIndustryIds, setSelectedIndustryIds] = useState<string[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState<number>(3);
  const [rateBySkillId, setRateBySkillId] = useState<
    Record<string, number | null>
  >({});
  const [saving, setSaving] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
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
          const nextIndustryIds = res.data.selectedIndustryIds;
          const compatibleSkillIds = filterCompatibleSkills(
            res.data.industries,
            nextIndustryIds,
            res.data.selectedSkillIds,
          );
          setSelectedIndustryIds(nextIndustryIds);
          setSelectedSkillIds(compatibleSkillIds);
          setYearsExperience(res.data.yearsExperience || 3);
          setRateBySkillId(res.data.rateBySkillId);
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
  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId],
    );
  };
  const selectedIndustries = industries.filter((industry) =>
    selectedIndustryIds.includes(industry.id),
  );
  const toggleIndustry = (industryId: string) => {
    const industry = industries.find((item) => item.id === industryId);
    if (!industry) return;

    if (selectedIndustryIds.includes(industryId)) {
      const skillIds = new Set(industry.skills.map((skill) => skill.id));
      setSelectedIndustryIds((current) =>
        current.filter((id) => id !== industryId),
      );
      setSelectedSkillIds((current) =>
        current.filter((skillId) => !skillIds.has(skillId)),
      );
      setRateBySkillId((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([skillId]) => !skillIds.has(skillId)),
        ),
      );
      return;
    }

    setSelectedIndustryIds((current) => [...current, industryId]);
  };
  const handleSave = async () => {
    if (!selectedIndustryIds.length || !selectedSkillIds.length) {
      Alert.alert('Skills required', 'Select at least one service skill.');
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
  };
}
