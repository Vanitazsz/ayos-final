import { DomainError, type AccountRole, type BookingStatus } from '@ayos/contracts';

const transitions: Record<BookingStatus, readonly BookingStatus[]> = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['WORKER_PREPARING', 'CANCELLED'],
  WORKER_PREPARING: ['WORKER_EN_ROUTE', 'CANCELLED'],
  WORKER_EN_ROUTE: ['WORKER_ARRIVED', 'CANCELLED'],
  WORKER_ARRIVED: ['SERVICE_STARTED', 'CANCELLED'],
  SERVICE_STARTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const workerOnly: readonly BookingStatus[] = [
  'ACCEPTED',
  'WORKER_PREPARING',
  'WORKER_EN_ROUTE',
  'WORKER_ARRIVED',
  'SERVICE_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
];

export function assertBookingTransition(
  from: BookingStatus,
  to: BookingStatus,
  actorRole: AccountRole,
  reason?: string,
): void {
  if (!transitions[from].includes(to)) {
    throw new DomainError(
      'INVALID_BOOKING_TRANSITION',
      `Booking cannot transition from ${from} to ${to}.`,
      409,
      { from, to },
    );
  }

  if (workerOnly.includes(to) && actorRole !== 'WORKER' && actorRole !== 'ADMIN') {
    throw new DomainError('FORBIDDEN', 'Only the assigned worker can advance this booking.', 403);
  }

  if (to === 'CANCELLED' && (!reason || reason.trim().length < 3)) {
    throw new DomainError('VALIDATION_FAILED', 'A cancellation reason is required.', 400);
  }
}

export function allowedBookingTransitions(status: BookingStatus): readonly BookingStatus[] {
  return transitions[status];
}
