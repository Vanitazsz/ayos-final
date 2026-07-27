import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { Navigation } from 'lucide-react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppText } from './AppText';
import { MapSurface } from './maps/MapSurface';
import { reverseGeocode } from '@/services/api';

export interface AddressDetails {
  streetNumber: string;
  street: string;
  district: string;
  city: string;
  region: string;
  postalCode: string;
  providerId?: string;
  confidence?: number | null;
  providerPayload?: Record<string, unknown>;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationPickerHandle {
  useCurrentLocation: () => Promise<void>;
}

interface Props {
  coords: LocationCoordinates | null;
  onCoordinatesDetected: (coords: LocationCoordinates) => void;
  onLocationDetected: (
    address: AddressDetails,
    coords: LocationCoordinates,
    displayLabel: string,
  ) => void;
  onWarning?: (message: string | null) => void;
  onLoadingChange?: (loading: boolean) => void;
  showAction?: boolean;
  error?: string;
}

export const LocationPicker = forwardRef<LocationPickerHandle, Props>(function LocationPicker(
  {
    coords,
    onCoordinatesDetected,
    onLocationDetected,
    onWarning,
    onLoadingChange,
    showAction = true,
    error,
  },
  ref,
) {
  const [loading, setLoading] = useState(false);

  const setBusy = (next: boolean) => {
    setLoading(next);
    onLoadingChange?.(next);
  };

  const detectCurrentLocation = async () => {
    setBusy(true);
    onWarning?.(null);
    try {
      if (Platform.OS !== 'web') {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') throw new Error('Location permission is required.');
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const current = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      onCoordinatesDetected(current);

      try {
        const result = await reverseGeocode(current.latitude, current.longitude);
        onLocationDetected(
          {
            streetNumber: '',
            street: result?.line ?? '',
            district: result?.barangay ?? '',
            city: result?.city ?? '',
            region: result?.province ?? '',
            postalCode: result?.postalCode ?? '',
            providerId: result?.providerId,
            confidence: result?.confidence,
            providerPayload: result?.raw,
          },
          current,
          result?.displayLabel ?? '',
        );
      } catch {
        onWarning?.(
          'Your map point is confirmed, but the address provider is unavailable. Enter the address manually.',
        );
      }
    } catch (reason) {
      Alert.alert(
        'Location unavailable',
        reason instanceof Error ? reason.message : 'Unable to detect your current location.',
      );
    } finally {
      setBusy(false);
    }
  };

  useImperativeHandle(ref, () => ({ useCurrentLocation: detectCurrentLocation }));

  return (
    <View style={styles.container}>
      {showAction && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use current location"
          style={[styles.button, error ? styles.errorBorder : null]}
          onPress={() => void detectCurrentLocation()}
          disabled={loading}
        >
          <Navigation size={20} color={Colors.white} />
          <AppText variant="body" weight="semiBold" color={Colors.white}>
            {loading ? 'Detecting Location...' : 'Use Current Location'}
          </AppText>
        </Pressable>
      )}
      {error && !coords && (
        <AppText variant="caption" color={Colors.error} style={styles.errorText}>
          {error}
        </AppText>
      )}
      {coords && (
        <View style={styles.mapContainer}>
          <MapSurface center={coords} points={[{ id: 'selected', ...coords }]} interactive={false} />
          <View style={styles.successBadge}>
            <AppText variant="caption" weight="bold" color={Colors.verified}>
              ✓ Location Verified
            </AppText>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: Spacing['4'] },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing['4'],
    borderRadius: Radius.lg,
    gap: Spacing['2'],
  },
  errorBorder: { borderColor: Colors.error, borderWidth: 1 },
  errorText: { marginTop: Spacing['2'] },
  mapContainer: {
    marginTop: Spacing['4'],
    height: 150,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  successBadge: {
    position: 'absolute',
    top: Spacing['2'],
    right: Spacing['2'],
    backgroundColor: Colors.verifiedBg,
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['1'],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.verified,
  },
});
