import React, { forwardRef, useImperativeHandle, useState } from 'react';
import {Platform, Pressable, StyleSheet, View} from 'react-native';
import * as Location from 'expo-location';
import { Navigation, MapPin } from 'lucide-react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppText } from './AppText';
import { MapSurface } from './maps/MapSurface';
import { reverseGeocode } from '@/services/api';
import { showAlert } from '@/components/AppAlert';

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
  buttonVariant?: 'solid' | 'outline';
  placeholderWhenEmpty?: boolean;
  error?: string;
}

export const LocationPicker = forwardRef<LocationPickerHandle, Props>(
  function LocationPicker(
    {
      coords,
      onCoordinatesDetected,
      onLocationDetected,
      onWarning,
      onLoadingChange,
      showAction = true,
      buttonVariant = 'solid',
      placeholderWhenEmpty = false,
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
          if (permission.status !== 'granted')
            throw new Error('Location permission is required.');
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
          const result = await reverseGeocode(
            current.latitude,
            current.longitude,
          );
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
        showAlert(
          'Location unavailable',
          reason instanceof Error
            ? reason.message
            : 'Unable to detect your current location.',
        );
      } finally {
        setBusy(false);
      }
    };

    useImperativeHandle(ref, () => ({
      useCurrentLocation: detectCurrentLocation,
    }));

    return (
      <View style={styles.container}>
        {showAction && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use current location"
            style={[
              styles.button,
              buttonVariant === 'outline' ? styles.buttonOutline : null,
              error ? styles.errorBorder : null,
            ]}
            onPress={() => void detectCurrentLocation()}
            disabled={loading}
          >
            <Navigation
              size={buttonVariant === 'outline' ? 16 : 20}
              color={
                buttonVariant === 'outline' ? Colors.primary : Colors.white
              }
            />
            <AppText
              variant="body"
              weight="semiBold"
              color={
                buttonVariant === 'outline' ? Colors.primary : Colors.white
              }
            >
              {loading ? 'Detecting Location...' : 'Use Current Location'}
            </AppText>
          </Pressable>
        )}
        {error && !coords && (
          <AppText
            variant="caption"
            color={Colors.error}
            style={styles.errorText}
          >
            {error}
          </AppText>
        )}
        {placeholderWhenEmpty && !coords && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Set service location"
            style={styles.placeholder}
            onPress={() => void detectCurrentLocation()}
            disabled={loading}
          >
            <MapPin size={32} color={Colors.textTertiary} />
            <AppText variant="bodySm" color={Colors.textTertiary}>
              Tap to set your service location
            </AppText>
          </Pressable>
        )}
        {coords && (
          <View style={styles.mapContainer}>
            <MapSurface
              center={coords}
              points={[{ id: 'selected', ...coords }]}
              interactive={false}
            />
            <View style={styles.successBadge}>
              <AppText variant="caption" weight="bold" color={Colors.verified}>
                ✓ Location Verified
              </AppText>
            </View>
          </View>
        )}
      </View>
    );
  },
);

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
  buttonOutline: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  placeholder: {
    height: 160,
    marginTop: Spacing['4'],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
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
