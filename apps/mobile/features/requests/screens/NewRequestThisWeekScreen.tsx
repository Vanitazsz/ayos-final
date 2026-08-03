import { useNewRequestThisWeekScreenController } from '../hooks/useNewRequestThisWeekScreenController';
import { ScheduleView } from './NewRequestThisWeekScreen.view';

export default function ScheduleScreen() {
  const model = useNewRequestThisWeekScreenController();
  return <ScheduleView model={model} />;
}
