import { useLayoutScreenController } from '../hooks/useLayoutScreenController';
import { RootLayoutView } from './LayoutScreen.view';

export default function RootLayout() {
  const model = useLayoutScreenController();
  return <RootLayoutView model={model} />;
}
