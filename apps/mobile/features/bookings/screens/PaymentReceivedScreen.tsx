import { usePaymentReceivedScreenController } from '../hooks/usePaymentReceivedScreenController';
import { PaymentReceivedView } from './PaymentReceivedScreen.view';

export default function PaymentReceivedScreen() {
  const model = usePaymentReceivedScreenController();
  return <PaymentReceivedView model={model} />;
}
