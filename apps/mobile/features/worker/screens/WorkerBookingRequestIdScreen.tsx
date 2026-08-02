import { useWorkerBookingRequestIdScreenController } from '../hooks/useWorkerBookingRequestIdScreenController';
import { BookingRequestView } from './WorkerBookingRequestIdScreen.view';

export default function BookingRequestScreen() {
  const model = useWorkerBookingRequestIdScreenController();
  return <BookingRequestView model={model} />;
}
