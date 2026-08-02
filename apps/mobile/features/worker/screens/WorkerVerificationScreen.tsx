import { useWorkerVerificationScreenController } from '../hooks/useWorkerVerificationScreenController';
import { VerificationView } from './WorkerVerificationScreen.view';

export default function VerificationScreen() {
  const model = useWorkerVerificationScreenController();
  return <VerificationView model={model} />;
}
