import { useSettingsLanguageScreenController } from '../hooks/useSettingsLanguageScreenController';
import { LanguageSettingsView } from './SettingsLanguageScreen.view';

export default function LanguageSettingsScreen() {
  const model = useSettingsLanguageScreenController();
  return <LanguageSettingsView model={model} />;
}
