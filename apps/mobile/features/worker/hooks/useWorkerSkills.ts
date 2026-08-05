import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  fetchMyWorkerSkillsAndIndustry,
  type IndustryWithSkills,
} from '@/services/api';

export interface WorkerSkillsSnapshot {
  industries: string;
  skills: string;
  years: number;
  rates: string;
}

export function useWorkerSkills() {
  const [industries, setIndustries] = useState<IndustryWithSkills[]>([]);
  const [selectedIndustryIds, setSelectedIndustryIds] = useState<string[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState(3);
  const [rateBySkillId, setRateBySkillId] = useState<
    Record<string, number | null>
  >({});
  const [initialSnapshot, setInitialSnapshot] =
    useState<WorkerSkillsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    void fetchMyWorkerSkillsAndIndustry()
      .then((res) => {
        if (res.error) {
          setError(res.error);
          return;
        }
        setIndustries(res.data.industries);
        const selectedIndustries = res.data.selectedIndustryIds
          .map((industryId) =>
            res.data.industries.find((item) => item.id === industryId),
          )
          .filter((item): item is IndustryWithSkills => item != null);
        const industrySkillIds = new Set(
          selectedIndustries.flatMap((item) =>
            item.skills.map((skill) => skill.id),
          ),
        );
        const compatibleSkillIds = res.data.selectedSkillIds.filter((skillId) =>
          industrySkillIds.has(skillId),
        );
        const nextRateBySkillId = Object.fromEntries(
          Object.entries(res.data.rateBySkillId).filter(([skillId]) =>
            compatibleSkillIds.includes(skillId),
          ),
        );
        const nextYearsExperience = res.data.yearsExperience || 3;
        setSelectedIndustryIds(selectedIndustries.map((item) => item.id));
        setSelectedSkillIds(compatibleSkillIds);
        setYearsExperience(nextYearsExperience);
        setRateBySkillId(nextRateBySkillId);
        setInitialSnapshot({
          industries: JSON.stringify(
            selectedIndustries.map((item) => item.id).sort(),
          ),
          skills: JSON.stringify([...compatibleSkillIds].sort()),
          years: nextYearsExperience,
          rates: JSON.stringify(Object.entries(nextRateBySkillId).sort()),
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load skills');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleIndustry = useCallback((industryId: string) => {
    setSelectedIndustryIds((current) =>
      current.includes(industryId)
        ? current.filter((id) => id !== industryId)
        : [...current, industryId],
    );
  }, []);

  return {
    industries,
    selectedIndustryIds,
    setSelectedIndustryIds,
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
    reload: load,
  };
}
