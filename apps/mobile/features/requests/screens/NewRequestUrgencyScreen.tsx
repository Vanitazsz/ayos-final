import { useNewRequestUrgencyScreenController } from '../hooks/useNewRequestUrgencyScreenController';
import { UrgencyView } from './NewRequestUrgencyScreen.view';

export default function UrgencyScreen() {
  const model = useNewRequestUrgencyScreenController();
  return <UrgencyView model={model} />;
}
