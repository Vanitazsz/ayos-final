import { useTrackingIdScreenController } from '../hooks/useTrackingIdScreenController';
import { TrackingView } from './TrackingIdScreen.view';

export default function TrackingScreen() {
  const model = useTrackingIdScreenController();
  return <TrackingView model={model} />;
}
