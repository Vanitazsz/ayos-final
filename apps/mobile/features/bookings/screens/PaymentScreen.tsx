import { usePaymentScreenController } from '../hooks/usePaymentScreenController';
import { PaymentView } from './PaymentScreen.view';

export default function PaymentScreen() {
  const model = usePaymentScreenController();
  return <PaymentView model={model} />;
}
