import { DomainError, type BookingStatus, type PaymentStatus } from '@ayos/contracts';

export function assertReviewAllowed(
  bookingStatus: BookingStatus,
  paymentStatus: PaymentStatus | undefined,
  existingReview: boolean,
): void {
  if (bookingStatus !== 'COMPLETED' || paymentStatus !== 'SUCCESSFUL') {
    throw new DomainError(
      'REVIEW_NOT_ALLOWED',
      'Feedback is available only after a completed and paid booking.',
      409,
    );
  }
  if (existingReview) {
    throw new DomainError('CONFLICT', 'Feedback has already been submitted for this booking.', 409);
  }
}
