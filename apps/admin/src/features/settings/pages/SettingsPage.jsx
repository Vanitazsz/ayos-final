import { useSettingsPageController } from '../hooks/useSettingsPageController';
import { SettingsView } from './SettingsPage.view';

const Settings = () => <SettingsView model={useSettingsPageController()} />;
export default Settings;
