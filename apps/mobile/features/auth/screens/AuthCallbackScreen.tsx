import { useAuthCallbackScreenController } from '../hooks/useAuthCallbackScreenController';
import { AuthCallbackView } from './AuthCallbackScreen.view';

export default function AuthCallbackScreen() {
  const model = useAuthCallbackScreenController();
  return <AuthCallbackView model={model} />;
}
