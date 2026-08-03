import { useWorkerServiceSetupScreenController } from '../hooks/useWorkerServiceSetupScreenController';
import { WorkerServiceSetupView } from './WorkerServiceSetupScreen.view';

export default function WorkerServiceSetupScreen() {
  const model = useWorkerServiceSetupScreenController();
  return <WorkerServiceSetupView model={model} />;
}
