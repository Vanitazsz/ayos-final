export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

const LATITUDE_METERS = 110_540;
const LONGITUDE_METERS = 111_320;
const CIRCLE_SEGMENTS = 64;

export function radiusGeoJson(
  center: MapCoordinates,
  meters: number,
): GeoJSON.FeatureCollection {
  const latitudeRadians = (center.latitude * Math.PI) / 180;
  const longitudeScale = Math.max(Math.cos(latitudeRadians), 0.01);
  const coordinates: GeoJSON.Position[] = [];

  for (let index = 0; index <= CIRCLE_SEGMENTS; index += 1) {
    const angle = (index / CIRCLE_SEGMENTS) * Math.PI * 2;
    coordinates.push([
      center.longitude + ((meters / LONGITUDE_METERS) * Math.cos(angle)) / longitudeScale,
      center.latitude + (meters / LATITUDE_METERS) * Math.sin(angle),
    ]);
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [coordinates] },
      },
    ],
  };
}

export function radiusBounds(center: MapCoordinates, meters: number): [number, number, number, number] {
  const latitudeRadians = (center.latitude * Math.PI) / 180;
  const longitudeDelta = (meters / LONGITUDE_METERS) / Math.max(Math.cos(latitudeRadians), 0.01);
  const latitudeDelta = meters / LATITUDE_METERS;

  return [
    center.longitude - longitudeDelta,
    center.latitude - latitudeDelta,
    center.longitude + longitudeDelta,
    center.latitude + latitudeDelta,
  ];
}

export function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - Math.min(Math.max(progress, 0), 1), 3);
}
