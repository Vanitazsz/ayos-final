export type WorkerBookingStatusMeta = {
  label: string;
  variant: 'verified' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
};

export type CustomerBookingStatusMeta = {
  label: string;
  color: string;
  bg: string;
};

export const WORKER_BOOKING_STATUS_META: Record<
  string,
  WorkerBookingStatusMeta
> = {
  hired: { label: 'Pending', variant: 'warning' },
  pending: { label: 'Pending', variant: 'warning' },
  pending_confirmation: { label: 'Awaiting Confirmation', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'info' },
  worker_preparing: { label: 'Preparing', variant: 'info' },
  worker_en_route: { label: 'En Route', variant: 'info' },
  en_route: { label: 'En Route', variant: 'info' },
  worker_arrived: { label: 'Arrived', variant: 'info' },
  service_started: { label: 'Started', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'error' },
};

export function workerBookingStatusMeta(status: string): WorkerBookingStatusMeta {
  return (
    WORKER_BOOKING_STATUS_META[status] ?? {
      label: status,
      variant: 'info',
    }
  );
}

export const CUSTOMER_BOOKING_STATUS_META: Record<
  string,
  CustomerBookingStatusMeta
> = {
  PENDING: {
    label: 'Awaiting Worker Acceptance',
    color: '#B78103',
    bg: '#FFF8E1',
  },
  ACCEPTED: { label: 'Confirmed', color: '#0277BD', bg: '#E1F5FE' },
  WORKER_PREPARING: {
    label: 'Confirmed · Preparing',
    color: '#0277BD',
    bg: '#E1F5FE',
  },
  WORKER_EN_ROUTE: { label: 'En Route 🚚', color: '#1565C0', bg: '#E8EAF6' },
  WORKER_ARRIVED: { label: 'Arrived 📍', color: '#2E7D32', bg: '#E8F5E9' },
  SERVICE_STARTED: {
    label: 'In Progress 🛠️',
    color: '#2E7D32',
    bg: '#E8F5E9',
  },
  IN_PROGRESS: { label: 'In Progress 🛠️', color: '#2E7D32', bg: '#E8F5E9' },
  PENDING_CONFIRMATION: {
    label: 'Awaiting Your Confirmation',
    color: '#B78103',
    bg: '#FFF8E1',
  },
  COMPLETED: { label: 'Completed ✅', color: '#2E7D32', bg: '#E8F5E9' },
  CANCELLED: { label: 'Cancelled ❌', color: '#C62828', bg: '#FFEBEE' },
};

export function customerBookingStatusMeta(
  status: string,
  fallbackStyle: { color: string; bg: string },
): CustomerBookingStatusMeta {
  return (
    CUSTOMER_BOOKING_STATUS_META[status] ?? {
      label: status || 'Active',
      color: fallbackStyle.color,
      bg: fallbackStyle.bg,
    }
  );
}
