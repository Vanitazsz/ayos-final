import { describe, expect, it } from 'vitest';
import { assertBookingTransition } from './booking.js';
import { rankWorkers } from './matching.js';
import {
  assertPaymentMethodEnabled,
  calculateCashPayment,
  cashPaymentIsSuccessful,
} from './payment.js';
import { assertReviewAllowed } from './reviews.js';

describe('booking lifecycle', () => {
  it('allows canonical worker transitions', () => {
    expect(() => assertBookingTransition('PENDING', 'ACCEPTED', 'WORKER')).not.toThrow();
    expect(() => assertBookingTransition('ACCEPTED', 'WORKER_EN_ROUTE', 'WORKER')).toThrow(
      'cannot transition',
    );
  });

  it('requires worker completion to wait for customer confirmation', () => {
    expect(() =>
      assertBookingTransition('IN_PROGRESS', 'PENDING_CONFIRMATION', 'WORKER'),
    ).not.toThrow();
    expect(() =>
      assertBookingTransition('PENDING_CONFIRMATION', 'COMPLETED', 'USER'),
    ).not.toThrow();
    expect(() => assertBookingTransition('IN_PROGRESS', 'COMPLETED', 'WORKER')).toThrow(
      'cannot transition',
    );
  });

  it('requires a cancellation reason', () => {
    expect(() => assertBookingTransition('PENDING', 'CANCELLED', 'USER')).toThrow(
      'cancellation reason',
    );
  });
});

describe('matching', () => {
  it('does not require a weekly schedule for eligibility', () => {
    const matches = rankWorkers(
      [
        {
          id: 'unsuitable-priority',
          approved: true,
          available: true,
          categoryIds: ['plumbing'],
          distanceKm: 5,
          rating: 5,
          reviewCount: 100,
          recommendationPriority: true,
        },
        {
          id: 'suitable',
          approved: true,
          available: true,
          categoryIds: ['plumbing'],
          distanceKm: 10,
          rating: 4,
          reviewCount: 20,
          recommendationPriority: false,
        },
      ],
      'plumbing',
    );

    expect(matches.map((match) => match.workerId)).toEqual(['unsuitable-priority', 'suitable']);
  });
});

describe('cash payments', () => {
  it('calculates the default commission and net amount', () => {
    expect(calculateCashPayment(1000)).toEqual({
      serviceAmount: 1000,
      commissionRate: 0.1,
      commissionAmount: 100,
      workerNetAmount: 900,
      homeownerPlatformCharge: 0,
      totalDue: 1000,
    });
  });

  it('requires both cash confirmations and enables GCash', () => {
    expect(cashPaymentIsSuccessful(['USER'])).toBe(false);
    expect(cashPaymentIsSuccessful(['USER', 'WORKER'])).toBe(true);
    expect(() => assertPaymentMethodEnabled('GCASH')).not.toThrow();
    expect(() => assertPaymentMethodEnabled('MAYA')).toThrow('not available');
  });
});

describe('reviews', () => {
  it('requires a completed and paid booking', () => {
    expect(() => assertReviewAllowed('COMPLETED', 'SUCCESSFUL', false)).not.toThrow();
    expect(() => assertReviewAllowed('COMPLETED', 'PENDING', false)).toThrow('completed and paid');
  });
});
