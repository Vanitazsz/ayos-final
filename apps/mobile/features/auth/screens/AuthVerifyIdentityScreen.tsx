import { useAuthVerifyIdentityScreenController } from '../hooks/useAuthVerifyIdentityScreenController';
import { VerifyIdentityView } from './AuthVerifyIdentityScreen.view';

export default function VerifyIdentityScreen() {
  const model = useAuthVerifyIdentityScreenController();
  return <VerifyIdentityView model={model} />;
}
