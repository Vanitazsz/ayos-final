import { useWorkerBookingsScreenController } from '../hooks/useWorkerBookingsScreenController';
import { WorkerBookingsView } from './WorkerBookingsScreen.view';

export default function WorkerBookingsScreen() {
  const model = useWorkerBookingsScreenController();
  return <WorkerBookingsView model={model} />;
}
