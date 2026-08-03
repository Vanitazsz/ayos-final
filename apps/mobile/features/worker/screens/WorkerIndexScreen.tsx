import { useWorkerIndexScreenController } from '../hooks/useWorkerIndexScreenController';
import { WorkerDashboardView } from './WorkerIndexScreen.view';

export default function WorkerDashboardScreen() {
  const model = useWorkerIndexScreenController();
  return <WorkerDashboardView model={model} />;
}
