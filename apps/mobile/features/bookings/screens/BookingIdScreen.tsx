import { useBookingIdScreenController } from '../hooks/useBookingIdScreenController';
import { BookingView } from './BookingIdScreen.view';

export default function BookingScreen() {
  const model = useBookingIdScreenController();
  return <BookingView model={model} />;
}
