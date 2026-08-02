import { useWorkerIndustrySkillsScreenController } from '../hooks/useWorkerIndustrySkillsScreenController';
import { WorkerIndustrySkillsView } from './WorkerIndustrySkillsScreen.view';

export default function WorkerIndustrySkillsScreen() {
  const model = useWorkerIndustrySkillsScreenController();
  return <WorkerIndustrySkillsView model={model} />;
}
