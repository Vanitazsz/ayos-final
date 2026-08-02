import { useProviderIdScreenController } from '../hooks/useProviderIdScreenController';
import { ProviderProfileView } from './ProviderIdScreen.view';

export default function ProviderProfileScreen() {
  const model = useProviderIdScreenController();
  return <ProviderProfileView model={model} />;
}
