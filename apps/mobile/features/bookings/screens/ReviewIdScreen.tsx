import { useReviewIdScreenController } from '../hooks/useReviewIdScreenController';
import { ReviewView } from './ReviewIdScreen.view';

export default function ReviewScreen() {
  const model = useReviewIdScreenController();
  return <ReviewView model={model} />;
}
