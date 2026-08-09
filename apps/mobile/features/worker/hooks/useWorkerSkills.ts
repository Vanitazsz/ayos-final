import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  fetchMyWorkerSkillsAndIndustry,
  type IndustryWithSkills,
} from '@/services/api';
import { filterWorkerSkillsForIndustries } from '@/utils/workerSkills';

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
        const compatible = filterWorkerSkillsForIndustries(
          res.data.selectedSkillIds,
          res.data.rateBySkillId,
          res.data.industries,
          selectedIndustries.map((item) => item.id),
        );
        const nextYearsExperience = res.data.yearsExperience || 3;
        setSelectedIndustryIds(selectedIndustries.map((item) => item.id));
        setSelectedSkillIds(compatible.skillIds);
        setYearsExperience(nextYearsExperience);
        setRateBySkillId(compatible.rates);
        setInitialSnapshot({
          industries: JSON.stringify(
            selectedIndustries.map((item) => item.id).sort(),
          ),
          skills: JSON.stringify([...compatible.skillIds].sort()),
          years: nextYearsExperience,
          rates: JSON.stringify(Object.entries(compatible.rates).sort()),
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

  const toggleIndustry = useCallback(
    (industryId: string) => {
      const nextIndustryIds = selectedIndustryIds.includes(industryId)
        ? selectedIndustryIds.filter((id) => id !== industryId)
        : [...selectedIndustryIds, industryId];
      const compatible = filterWorkerSkillsForIndustries(
        selectedSkillIds,
        rateBySkillId,
        industries,
        nextIndustryIds,
      );
      setSelectedIndustryIds(nextIndustryIds);
      setSelectedSkillIds(compatible.skillIds);
      setRateBySkillId(compatible.rates);
    },
    [industries, rateBySkillId, selectedIndustryIds, selectedSkillIds],
  );

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
