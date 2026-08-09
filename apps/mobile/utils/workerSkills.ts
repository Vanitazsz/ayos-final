export interface SkillIndustryCatalogItem {
  id: string;
  skills: Array<{ id: string }>;
}

export function filterWorkerSkillsForIndustries(
  skillIds: string[],
  rates: Record<string, number | null>,
  catalog: SkillIndustryCatalogItem[],
  selectedIndustryIds: string[],
): { skillIds: string[]; rates: Record<string, number | null> } {
  const selectedIndustrySet = new Set(selectedIndustryIds);
  const compatibleSkillIds = new Set(
    catalog
      .filter((industry) => selectedIndustrySet.has(industry.id))
      .flatMap((industry) => industry.skills.map((skill) => skill.id)),
  );
  const nextSkillIds = skillIds.filter((skillId) => compatibleSkillIds.has(skillId));
  return {
    skillIds: nextSkillIds,
    rates: Object.fromEntries(
      Object.entries(rates).filter(([skillId]) => nextSkillIds.includes(skillId)),
    ),
  };
}
