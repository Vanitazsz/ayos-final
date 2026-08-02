import { useTabsBookingsScreenController } from '../hooks/useTabsBookingsScreenController';
import { BookingsView } from './TabsBookingsScreen.view';

export default function BookingsScreen() {
  const model = useTabsBookingsScreenController();
  return <BookingsView model={model} />;
}
