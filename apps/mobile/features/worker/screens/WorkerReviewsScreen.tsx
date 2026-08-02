import { useWorkerReviewsScreenController } from '../hooks/useWorkerReviewsScreenController';
import { WorkerReviewsView } from './WorkerReviewsScreen.view';

export default function WorkerReviewsScreen() {
  const model = useWorkerReviewsScreenController();
  return <WorkerReviewsView model={model} />;
}
