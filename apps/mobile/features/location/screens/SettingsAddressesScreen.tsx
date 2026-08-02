import { useSettingsAddressesScreenController } from '../hooks/useSettingsAddressesScreenController';
import { SavedAddressesView } from './SettingsAddressesScreen.view';

export default function SavedAddressesScreen() {
  const model = useSettingsAddressesScreenController();
  return <SavedAddressesView model={model} />;
}
