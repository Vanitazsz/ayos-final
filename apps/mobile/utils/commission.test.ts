import { describe, expect, it } from 'vitest';
import {
  calculateCommissionAmount,
  normalizeCommissionRatePercent,
} from './commission';

describe('commission helpers', () => {
  it('converts a service-category percentage into a currency amount', () => {
    expect(calculateCommissionAmount(1000, 7.5)).toBe(75);
  });

  it('accepts numeric strings from RPC responses', () => {
    expect(normalizeCommissionRatePercent('12.50')).toBe(12.5);
  });

  it('rejects missing or out-of-range rates', () => {
    expect(() => normalizeCommissionRatePercent(undefined)).toThrow(
      'Invalid commission rate',
    );
    expect(() => normalizeCommissionRatePercent(50.01)).toThrow(
      'Invalid commission rate',
    );
  });
});
