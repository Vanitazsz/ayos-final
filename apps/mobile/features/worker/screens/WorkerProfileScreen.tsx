import { useWorkerProfileScreenController } from '../hooks/useWorkerProfileScreenController';
import { WorkerProfileView } from './WorkerProfileScreen.view';

export default function WorkerProfileScreen() {
  const model = useWorkerProfileScreenController();
  return <WorkerProfileView model={model} />;
}
