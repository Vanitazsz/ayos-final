export { selectImage } from '@/services/deviceImages';
export { getCurrentCoordinates } from '@/services/deviceLocation';
export { workerBookingStatusMeta } from '@/services/bookingStatus';
export {
  acceptJob,
  attachBookingProof,
  arriveAtJob,
  completeJob,
  declineAssignedBooking,
  departForJob,
  fetchBookingDetail,
  markJobInProgress,
  prepareJob,
  startJob,
} from '@/services/bookings';
export { confirmCashPayment } from '@/services/payments';
export { confirmWorkerArrival } from '@/services/workerOperations';
export { reportBookingParticipant } from '@/services/support';
export { subscribeToTable } from '@/services/realtime';
export {
  startEnRouteLocationPublisher,
  stopEnRouteLocationPublisher,
} from '@/services/liveDispatch';
export { uploadBookingProof } from '@/services/uploads';
export { type WorkerBooking } from '@/services/bookings';
import {
  formatAddressParts,
  formatDate,
  formatPesoMajor,
} from '@/utils/format';
export {
  formatAddressParts,
  formatDate,
  formatPesoMajor,
} from '@/utils/format';

export const viewBookingStatus = (status: string): string =>
  status === 'PENDING'
    ? 'hired'
    : status === 'ACCEPTED' || status === 'WORKER_PREPARING'
      ? 'accepted'
      : status === 'WORKER_EN_ROUTE' || status === 'WORKER_ARRIVED'
        ? 'en_route'
        : status === 'SERVICE_STARTED' || status === 'IN_PROGRESS'
          ? 'in_progress'
          : status === 'PENDING_CONFIRMATION'
            ? 'pending_review'
            : status.toLowerCase();

export const bookingDurationLabel = (
  acceptedAt: string | null | undefined,
  completedAt: string | null | undefined,
): string => {
  if (!acceptedAt || !completedAt) return 'Not recorded';
  const minutes = Math.max(
    0,
    Math.round(
      (new Date(completedAt).getTime() - new Date(acceptedAt).getTime()) /
        60000,
    ),
  );
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export const formatScheduleTime = (
  scheduledAt: string | null | undefined,
): string =>
  new Date(scheduledAt ?? '').toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatBookingPrice = (
  earningsAmount: number | null | undefined,
): string =>
  earningsAmount == null ? 'Price pending' : formatPesoMajor(earningsAmount);

export const isUrgentScheduled = (
  scheduledAt: string | null | undefined,
): boolean => new Date(scheduledAt as string).getTime() - Date.now() < 86400000;
