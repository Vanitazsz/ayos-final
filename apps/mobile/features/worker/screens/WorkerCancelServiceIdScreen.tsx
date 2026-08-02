import { useWorkerCancelServiceIdScreenController } from '../hooks/useWorkerCancelServiceIdScreenController';
import { CancelServiceView } from './WorkerCancelServiceIdScreen.view';

export default function CancelServiceScreen() {
  const model = useWorkerCancelServiceIdScreenController();
  return <CancelServiceView model={model} />;
}
