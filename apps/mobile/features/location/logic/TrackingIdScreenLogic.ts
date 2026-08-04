export {
  blockAccount,
  openBookingDispute,
  reportBookingParticipant,
} from '@/services/support';
export {
  confirmJobCompletion,
  fetchBookingTracking,
} from '@/services/bookings';
export { subscribeToTable } from '@/services/realtime';
export {
  subscribeToEnRouteLocation,
  type LiveEnRouteLocation,
} from '@/services/liveDispatch';
export { createRealtimeRefreshController } from '@/services/requestControl';
export { fetchAccountMobile } from '@/repositories/accounts';

export type TrackingTimelineStep = {
  id: string;
  title: string;
  subtitle: string;
};

export const TRACKING_TIMELINE_STEPS: TrackingTimelineStep[] = [
  {
    id: '1',
    title: 'Booking Confirmed',
    subtitle: 'Your booking has been placed',
  },
  {
    id: '2',
    title: 'Provider Accepted',
    subtitle: 'A provider accepted your job',
  },
  { id: '3', title: 'Provider En Route', subtitle: 'Provider is on the way' },
  { id: '4', title: 'Provider Arrived', subtitle: 'Provider has arrived' },
  { id: '5', title: 'Service In Progress', subtitle: 'Work has started' },
  { id: '6', title: 'Completed', subtitle: 'Service finished' },
];
