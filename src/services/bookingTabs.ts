export const CUSTOMER_BOOKING_TABS = [
  'Upcoming',
  'Ongoing',
  'Completed',
  'Cancelled',
] as const;

export type CustomerBookingTab = (typeof CUSTOMER_BOOKING_TABS)[number];

export function getCustomerBookingTab(
  rawStatus: string,
): CustomerBookingTab {
  const status = rawStatus.toUpperCase();
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'CANCELLED') return 'Cancelled';
  if (
    [
      'WORKER_EN_ROUTE',
      'WORKER_ARRIVED',
      'SERVICE_STARTED',
      'IN_PROGRESS',
      'PENDING_CONFIRMATION',
      'ONGOING',
    ].includes(status)
  ) {
    return 'Ongoing';
  }
  return 'Upcoming';
}

export function getInitialCustomerBookingTab(
  filter?: string | string[],
): CustomerBookingTab {
  const value = Array.isArray(filter) ? filter[0] : filter;

  return CUSTOMER_BOOKING_TABS.includes(value as CustomerBookingTab)
    ? (value as CustomerBookingTab)
    : 'Upcoming';
}
