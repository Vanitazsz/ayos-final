import { useBookingsPageController } from '../hooks/useBookingsPageController';
import { BookingsView } from './BookingsPage.view';

const Bookings = () => <BookingsView model={useBookingsPageController()} />;
export default Bookings;
