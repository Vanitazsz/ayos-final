import { describe, expect, it } from 'vitest';

import { getInitialCustomerBookingTab } from './bookingTabs';

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
