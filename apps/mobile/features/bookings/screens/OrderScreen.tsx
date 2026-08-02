import { useOrderScreenController } from '../hooks/useOrderScreenController';
import { OrderDetailsView } from './OrderScreen.view';

export default function OrderDetailsScreen() {
  const model = useOrderScreenController();
  return <OrderDetailsView model={model} />;
}
