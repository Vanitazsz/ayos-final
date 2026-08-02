import { useRegisterWorkerScreenController } from '../hooks/useRegisterWorkerScreenController';
import { RegisterWorkerView } from './RegisterWorkerScreen.view';

export default function RegisterWorkerScreen() {
  const model = useRegisterWorkerScreenController();
  return <RegisterWorkerView model={model} />;
}
