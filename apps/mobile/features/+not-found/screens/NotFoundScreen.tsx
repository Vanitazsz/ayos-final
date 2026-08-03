import { useNotFoundScreenController } from '../hooks/useNotFoundScreenController';
import { NotFoundView } from './NotFoundScreen.view';

export default function NotFoundScreen() {
  const model = useNotFoundScreenController();
  return <NotFoundView model={model} />;
}
