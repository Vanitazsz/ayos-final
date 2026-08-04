import { useLayoutScreenController } from '../hooks/useLayoutScreenController';
import { RootLayoutView } from './LayoutScreen.view';
import '@/services/enRouteLocationBackground';

export default function RootLayout() {
  const model = useLayoutScreenController();
  return <RootLayoutView model={model} />;
}
