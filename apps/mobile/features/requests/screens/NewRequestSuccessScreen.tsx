import { useNewRequestSuccessScreenController } from '../hooks/useNewRequestSuccessScreenController';
import { RequestSuccessView } from './NewRequestSuccessScreen.view';

export default function RequestSuccessScreen() {
  const model = useNewRequestSuccessScreenController();
  return <RequestSuccessView model={model} />;
}
