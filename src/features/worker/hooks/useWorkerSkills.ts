import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  fetchMyWorkerSkillsAndIndustry,
  type IndustryWithSkills,
} from '@/services/api';
import { filterWorkerSkillsForIndustries } from '@/utils/workerSkills';
import {
  queryKeys,
  QUERY_STALE_TIMES,
  toQueryData,
} from '@/services/queryUtils';
import { useAuthStore } from '@/store/useAuthStore';

export interface WorkerSkillsSnapshot {
  industries: string;
  skills: string;
  years: number;
  rates: string;
}

export function useWorkerSkills() {
  const userId = useAuthStore((s) => s.user?.id);
  const [industries, setIndustries] = useState<IndustryWithSkills[]>([]);
  const [selectedIndustryIds, setSelectedIndustryIds] = useState<string[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState(3);
  const [rateBySkillId, setRateBySkillId] = useState<
    Record<string, number | null>
  >({});
  const [initialSnapshot, setInitialSnapshot] =
    useState<WorkerSkillsSnapshot | null>(null);
  const [error, setError] = useState('');

  const skillsQuery = useQuery({
    queryKey: queryKeys.workerSkills(userId ?? 'anonymous'),
    queryFn: async () => toQueryData(await fetchMyWorkerSkillsAndIndustry()),
    staleTime: QUERY_STALE_TIMES.profile,
    enabled: Boolean(userId),
  });

  useEffect(() => {
    const res = skillsQuery.data;
    if (!res) return;
    setIndustries(res.industries);
    const selectedIndustries = res.selectedIndustryIds
      .map((industryId) =>
        res.industries.find((item) => item.id === industryId),
      )
      .filter((item): item is IndustryWithSkills => item != null);
    const compatible = filterWorkerSkillsForIndustries(
      res.selectedSkillIds,
      res.rateBySkillId,
      res.industries,
      selectedIndustries.map((item) => item.id),
    );
    const nextYearsExperience = res.yearsExperience || 3;
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
  }, [skillsQuery.data]);

  const loading = skillsQuery.isLoading;

  useFocusEffect(
    useCallback(() => {
      if (!skillsQuery.isLoading && skillsQuery.isStale) {
        void skillsQuery.refetch();
      }
    }, [skillsQuery.isLoading, skillsQuery.isStale, skillsQuery.refetch]),
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
    reload: () => void skillsQuery.refetch(),
  };
}
