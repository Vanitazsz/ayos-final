import { useAuthRegisterScreenController } from '../hooks/useAuthRegisterScreenController';
import { RegisterView } from './AuthRegisterScreen.view';

export default function RegisterScreen() {
  const model = useAuthRegisterScreenController();
  return <RegisterView model={model} />;
}
