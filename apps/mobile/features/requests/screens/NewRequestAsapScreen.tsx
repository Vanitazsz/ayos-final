import { useNewRequestAsapScreenController } from '../hooks/useNewRequestAsapScreenController';
import { ReviewRequestView } from './NewRequestAsapScreen.view';

export default function ReviewRequestScreen() {
  const model = useNewRequestAsapScreenController();
  return <ReviewRequestView model={model} />;
}
