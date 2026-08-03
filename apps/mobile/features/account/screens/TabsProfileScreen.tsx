import { useTabsProfileScreenController } from '../hooks/useTabsProfileScreenController';
import { ProfileView } from './TabsProfileScreen.view';

export default function ProfileScreen() {
  const model = useTabsProfileScreenController();
  return <ProfileView model={model} />;
}
