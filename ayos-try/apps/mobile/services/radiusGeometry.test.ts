import { describe, expect, it } from 'vitest';

import { easeOutCubic, radiusBounds, radiusGeoJson } from '../components/maps/radiusGeometry';

const treceMartires = { latitude: 14.2814, longitude: 120.871 };

describe('service-radius map geometry', () => {
  it('creates a closed polygon around the selected location', () => {
    const geometry = radiusGeoJson(treceMartires, 24_000);
    const coordinates = geometry.features[0].geometry;

    expect(coordinates.type).toBe('Polygon');
    if (coordinates.type !== 'Polygon') return;
    expect(coordinates.coordinates[0]).toHaveLength(65);
    expect(coordinates.coordinates[0][0]).toEqual(coordinates.coordinates[0][64]);
  });

  it('returns bounds that contain the entire circle', () => {
    const [west, south, east, north] = radiusBounds(treceMartires, 24_000);

    expect(west).toBeLessThan(treceMartires.longitude);
    expect(east).toBeGreaterThan(treceMartires.longitude);
    expect(south).toBeLessThan(treceMartires.latitude);
    expect(north).toBeGreaterThan(treceMartires.latitude);
  });

  it('uses an ease-out curve for smooth radius changes', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});
