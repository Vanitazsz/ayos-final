import { usePaymentsPageController } from '../hooks/usePaymentsPageController';
import { PaymentsView } from './PaymentsPage.view';

const Payments = () => <PaymentsView model={usePaymentsPageController()} />;
export default Payments;
