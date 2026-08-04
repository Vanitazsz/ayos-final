export { createSupportTicket, reportBookingParticipant } from './apiCore';

export const SUPPORT_EMAIL =
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@a-yos.local';

export function buildProviderReportEmail(input: {
  bookingId: string;
  providerName?: string | null;
  providerAccountId?: string | null;
  bookingStatus?: string | null;
}) {
  const subject = `Provider Report - Booking ${input.bookingId}`;
  const body = [
    'Hello Administrator,',
    '',
    'I would like to report a provider for the booking below.',
    '',
    `Booking ID: ${input.bookingId}`,
    `Provider: ${input.providerName ?? 'N/A'}`,
    input.providerAccountId
      ? `Provider Account ID: ${input.providerAccountId}`
      : null,
    input.bookingStatus
      ? `Booking Status: ${input.bookingStatus.replaceAll('_', ' ')}`
      : null,
    '',
    'Please review and take the appropriate action. Thank you.',
  ]
    .filter(Boolean)
    .join('\n');
  return { to: SUPPORT_EMAIL, subject, body };
}
