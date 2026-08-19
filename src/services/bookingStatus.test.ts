import { describe, expect, it } from 'vitest';

import {
  WORKER_BOOKING_STATUS_META,
  CUSTOMER_BOOKING_STATUS_META,
  workerBookingStatusMeta,
  customerBookingStatusMeta,
} from './bookingStatus';

describe('WORKER_BOOKING_STATUS_META', () => {
  it('covers every status key rendered by worker views', () => {
    expect(Object.keys(WORKER_BOOKING_STATUS_META).sort()).toEqual(
      [
        'hired',
        'pending',
        'pending_confirmation',
        'accepted',
        'worker_preparing',
        'worker_en_route',
        'en_route',
        'worker_arrived',
        'service_started',
        'in_progress',
        'completed',
        'cancelled',
      ].sort(),
    );
  });

  it('labels statuses exactly as the worker screens did', () => {
    expect(workerBookingStatusMeta('hired')).toEqual({
      label: 'Pending',
      variant: 'warning',
    });
    expect(workerBookingStatusMeta('pending_confirmation')).toEqual({
      label: 'Awaiting Confirmation',
      variant: 'warning',
    });
    expect(workerBookingStatusMeta('worker_preparing')).toEqual({
      label: 'Preparing',
      variant: 'info',
    });
    expect(workerBookingStatusMeta('worker_en_route')).toEqual({
      label: 'En Route',
      variant: 'info',
    });
    expect(workerBookingStatusMeta('en_route')).toEqual({
      label: 'En Route',
      variant: 'info',
    });
    expect(workerBookingStatusMeta('worker_arrived')).toEqual({
      label: 'Arrived',
      variant: 'info',
    });
    expect(workerBookingStatusMeta('service_started')).toEqual({
      label: 'Started',
      variant: 'warning',
    });
    expect(workerBookingStatusMeta('in_progress')).toEqual({
      label: 'In Progress',
      variant: 'warning',
    });
    expect(workerBookingStatusMeta('completed')).toEqual({
      label: 'Completed',
      variant: 'success',
    });
    expect(workerBookingStatusMeta('cancelled')).toEqual({
      label: 'Cancelled',
      variant: 'error',
    });
  });

  it('falls back to the raw status with the info variant', () => {
    expect(workerBookingStatusMeta('UNKNOWN')).toEqual({
      label: 'UNKNOWN',
      variant: 'info',
    });
  });
});

describe('CUSTOMER_BOOKING_STATUS_META', () => {
  it('labels customer statuses exactly as the bookings tab did', () => {
    expect(customerBookingStatusMeta('PENDING', { color: '#111', bg: '#222' })).toEqual({
      label: 'Awaiting Worker Acceptance',
      color: '#B78103',
      bg: '#FFF8E1',
    });
    expect(customerBookingStatusMeta('COMPLETED', { color: '#111', bg: '#222' })).toEqual({
      label: 'Completed',
      color: '#2E7D32',
      bg: '#E8F5E9',
    });
    expect(customerBookingStatusMeta('WORKER_EN_ROUTE', { color: '#111', bg: '#222' })).toEqual({
      label: 'En Route',
      color: '#1565C0',
      bg: '#E8EAF6',
    });
  });

  it('covers every status key in the customer map', () => {
    expect(Object.keys(CUSTOMER_BOOKING_STATUS_META).sort()).toEqual(
      [
        'PENDING',
        'ACCEPTED',
        'WORKER_PREPARING',
        'WORKER_EN_ROUTE',
        'WORKER_ARRIVED',
        'SERVICE_STARTED',
        'IN_PROGRESS',
        'PENDING_CONFIRMATION',
        'COMPLETED',
        'CANCELLED',
      ].sort(),
    );
  });

  it('falls back to the raw status label with the provided style', () => {
    expect(
      customerBookingStatusMeta('UNKNOWN', { color: '#123456', bg: '#ABCDEF' }),
    ).toEqual({ label: 'UNKNOWN', color: '#123456', bg: '#ABCDEF' });
    expect(customerBookingStatusMeta('', { color: '#123456', bg: '#ABCDEF' })).toEqual({
      label: 'Active',
      color: '#123456',
      bg: '#ABCDEF',
    });
  });
});
