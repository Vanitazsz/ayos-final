import { usePaymentIdScreenController } from '../hooks/usePaymentIdScreenController';
import { PaymentView } from './PaymentIdScreen.view';

export default function PaymentScreen() {
  const model = usePaymentIdScreenController();
  return <PaymentView model={model} />;
}
