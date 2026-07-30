import { describe, expect, it } from 'vitest';

import {
  getCustomerBookingTab,
  getInitialCustomerBookingTab,
} from './bookingTabs';

describe('getInitialCustomerBookingTab', () => {
  it('selects the completed tab from the route filter', () => {
    expect(getInitialCustomerBookingTab('Completed')).toBe('Completed');
  });

  it('defaults to upcoming when the route filter is absent', () => {
    expect(getInitialCustomerBookingTab()).toBe('Upcoming');
  });

  it('defaults to upcoming when the route filter is invalid', () => {
    expect(getInitialCustomerBookingTab('Unknown')).toBe('Upcoming');
  });
});

describe('getCustomerBookingTab', () => {
  it('keeps pending customer confirmation in the ongoing tab', () => {
    expect(getCustomerBookingTab('PENDING_CONFIRMATION')).toBe('Ongoing');
  });

  it('places terminal bookings in their matching tabs', () => {
    expect(getCustomerBookingTab('COMPLETED')).toBe('Completed');
    expect(getCustomerBookingTab('CANCELLED')).toBe('Cancelled');
  });
});
