import { usePaymentSuccessScreenController } from '../hooks/usePaymentSuccessScreenController';
import { PaymentSuccessView } from './PaymentSuccessScreen.view';

export default function PaymentSuccessScreen() {
  const model = usePaymentSuccessScreenController();
  return <PaymentSuccessView model={model} />;
}
