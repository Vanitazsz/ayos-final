import { describe, expect, it } from 'vitest';

import { buildRouteSummary, haversineKm } from './routeSummary';

describe('route summary logic', () => {
  it('calculates the great-circle distance between coordinates', () => {
    expect(haversineKm(14.5995, 120.9842, 14.6091, 121.0223)).toBeCloseTo(
      4.23,
      1,
    );
  });

  it('prefers routing results and falls back to direct-distance travel time', () => {
    expect(
      buildRouteSummary({
        directDistanceKm: 10,
        displayLabel: 'Starting point',
        route: { distanceMeters: 12_500, durationSeconds: 1_501 },
      }),
    ).toEqual({
      startAddress: 'Starting point',
      distanceKm: 12.5,
      minutes: 26,
    });

    expect(buildRouteSummary({ directDistanceKm: 10, route: null })).toEqual({
      startAddress: 'Worker starting location',
      distanceKm: 10,
      minutes: 24,
    });
  });
});
