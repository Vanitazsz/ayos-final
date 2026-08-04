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

import { CheckCircle2, Clock, MapPin, Wrench } from 'lucide-react-native';
export { Clock, CheckCircle2, MapPin, Wrench };

export type TrackingTimelineStep = {
  id: string;
  title: string;
  subtitle: string;
};

export const STATUS_STEP_MAP: Record<string, number> = {
  PENDING: 0,
  ACCEPTED: 1,
  WORKER_PREPARING: 1,
  WORKER_EN_ROUTE: 2,
  WORKER_ARRIVED: 3,
  SERVICE_STARTED: 4,
  IN_PROGRESS: 4,
  PENDING_CONFIRMATION: 4,
  COMPLETED: 5,
};

export const STATUS_INFO: Record<
  string,
  { title: string; subtitle: string; icon: any }
> = {
  PENDING: {
    title: 'Waiting for Provider',
    subtitle: 'Your booking has been sent. A provider will accept shortly.',
    icon: Clock,
  },
  ACCEPTED: {
    title: 'Provider Accepted',
    subtitle: 'Your provider has accepted the job and is getting ready.',
    icon: CheckCircle2,
  },
  WORKER_PREPARING: {
    title: 'Provider Preparing',
    subtitle: 'Your provider is preparing to head to your location.',
    icon: Clock,
  },
  WORKER_EN_ROUTE: {
    title: 'Provider On The Way',
    subtitle: 'Your provider is en route to your location.',
    icon: MapPin,
  },
  WORKER_ARRIVED: {
    title: 'Provider Has Arrived',
    subtitle: 'Your provider has arrived at your location.',
    icon: MapPin,
  },
  SERVICE_STARTED: {
    title: 'Service In Progress',
    subtitle: 'Work has begun on your service request.',
    icon: Wrench,
  },
  IN_PROGRESS: {
    title: 'Service In Progress',
    subtitle: 'Work is currently being done.',
    icon: Wrench,
  },
  PENDING_CONFIRMATION: {
    title: 'Confirm Job Completion',
    subtitle: 'Your provider marked the job complete. Please confirm the work.',
    icon: Clock,
  },
  COMPLETED: {
    title: 'Service Completed',
    subtitle: 'Your service has been completed. Please confirm and pay.',
    icon: CheckCircle2,
  },
  CANCELLED: {
    title: 'Booking Cancelled',
    subtitle: 'This booking has been cancelled.',
    icon: Clock,
  },
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
