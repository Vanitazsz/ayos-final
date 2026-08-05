import { useWorkerIndustrySkillsScreenController } from '../hooks/useWorkerIndustrySkillsScreenController';
import { IndustrySkillsView } from './WorkerIndustrySkillsScreen.view';

export default function WorkerIndustrySkillsScreen() {
  const model = useWorkerIndustrySkillsScreenController();
  return <IndustrySkillsView model={model} />;
}
