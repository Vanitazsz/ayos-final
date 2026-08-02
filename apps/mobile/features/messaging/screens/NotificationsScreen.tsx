import { useNotificationsScreenController } from '../hooks/useNotificationsScreenController';
import { NotificationsView } from './NotificationsScreen.view';

export default function NotificationsScreen() {
  const model = useNotificationsScreenController();
  return <NotificationsView model={model} />;
}
