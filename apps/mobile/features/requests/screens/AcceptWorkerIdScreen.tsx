import { useAcceptWorkerIdScreenController } from '../hooks/useAcceptWorkerIdScreenController';
import { AcceptWorkerModalView } from './AcceptWorkerIdScreen.view';

export default function AcceptWorkerModal() {
  const model = useAcceptWorkerIdScreenController();
  return <AcceptWorkerModalView model={model} />;
}
