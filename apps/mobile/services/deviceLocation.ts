import * as Location from 'expo-location';

export interface DeviceCoordinates {
  latitude: number;
  longitude: number;
}

const accuracy = {
  balanced: Location.Accuracy.Balanced,
  high: Location.Accuracy.High,
} as const;

export async function getCurrentCoordinates(
  precision: keyof typeof accuracy = 'balanced',
): Promise<DeviceCoordinates> {
  const position = await Location.getCurrentPositionAsync({
    accuracy: accuracy[precision],
  });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

export async function requestCurrentCoordinates(
  precision: keyof typeof accuracy = 'balanced',
): Promise<DeviceCoordinates> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error('Location permission is required');
  return getCurrentCoordinates(precision);
}

export async function requestCurrentCoordinatesIfPermitted(
  precision: keyof typeof accuracy = 'balanced',
): Promise<DeviceCoordinates | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  return permission.granted ? getCurrentCoordinates(precision) : null;
}
