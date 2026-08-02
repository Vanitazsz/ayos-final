import { useSubscriptionsPageController } from '../hooks/useSubscriptionsPageController';
import { SubscriptionsView } from './SubscriptionsPage.view';

const Subscriptions = () => <SubscriptionsView model={useSubscriptionsPageController()} />;
export default Subscriptions;
