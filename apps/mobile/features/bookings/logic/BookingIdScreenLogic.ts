export { fetchProviderProfile } from '@/services/catalog';
export { selectWorker } from '@/services/requests';

export interface BookingDay {
  id: string;
  day: string;
  date: string;
  today: boolean;
  iso: string;
}

export interface BookingTimeSlot {
  id: string;
  label: string;
  available: boolean;
}

export const bookingWeekDays: BookingDay[] = Array.from(
  { length: 7 },
  (_, index) => {
    const value = new Date();
    value.setDate(value.getDate() + index);
    return {
      id: String(index),
      day: value.toLocaleDateString('en-PH', { weekday: 'short' }),
      date: String(value.getDate()),
      today: index === 0,
      iso: value.toISOString(),
    };
  },
);

export const bookingTimeSlots: BookingTimeSlot[] = [
  '08:00',
  '10:00',
  '13:00',
  '15:00',
  '17:00',
].map((label, index) => ({ id: String(index), label, available: true }));
