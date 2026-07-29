export const CUSTOMER_BOOKING_TABS = [
  'Upcoming',
  'Ongoing',
  'Completed',
  'Cancelled',
] as const;

export type CustomerBookingTab = (typeof CUSTOMER_BOOKING_TABS)[number];

export function getInitialCustomerBookingTab(
  filter?: string | string[],
): CustomerBookingTab {
  const value = Array.isArray(filter) ? filter[0] : filter;

  return CUSTOMER_BOOKING_TABS.includes(value as CustomerBookingTab)
    ? (value as CustomerBookingTab)
    : 'Upcoming';
}
