import { useWorkerSettingsScreenController } from '../hooks/useWorkerSettingsScreenController';
import { WorkerSettingsView } from './WorkerSettingsScreen.view';

export default function WorkerSettingsScreen() {
  const model = useWorkerSettingsScreenController();
  return <WorkerSettingsView model={model} />;
}
