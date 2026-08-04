import { type IndustryWithSkills } from '@/services/workerOperations';

export {
  fetchMyWorkerSkillsAndIndustry,
  updateMyWorkerSkillsAndIndustry,
  type IndustryWithSkills,
} from '@/services/workerOperations';

export const filterCompatibleSkills = (
  industries: IndustryWithSkills[],
  selectedIndustryIds: string[],
  selectedSkillIds: string[],
): string[] => {
  const industrySkillIds = new Set(
    industries
      .filter((industry) => selectedIndustryIds.includes(industry.id))
      .flatMap((industry) => industry.skills.map((skill) => skill.id)),
  );
  return selectedSkillIds.filter((skillId) => industrySkillIds.has(skillId));
};
