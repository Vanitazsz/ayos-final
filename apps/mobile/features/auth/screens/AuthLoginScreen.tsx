import { useAuthLoginScreenController } from '../hooks/useAuthLoginScreenController';
import { LoginView } from './AuthLoginScreen.view';

export default function LoginScreen() {
  const model = useAuthLoginScreenController();
  return <LoginView model={model} />;
}
