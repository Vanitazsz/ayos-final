import { useNotificationsPageController } from '../hooks/useNotificationsPageController';
import { NotificationsView } from './NotificationsPage.view';

const Notifications = () => <NotificationsView model={useNotificationsPageController()} />;
export default Notifications;
