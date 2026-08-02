import { useTabsHomeScreenController } from '../hooks/useTabsHomeScreenController';
import { HomeView } from './TabsHomeScreen.view';

export default function HomeScreen() {
  const model = useTabsHomeScreenController();
  return <HomeView model={model} />;
}
