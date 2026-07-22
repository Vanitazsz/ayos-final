import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Colors, Radius, Spacing, Elevation } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { MapSurface } from '@/components/maps/MapSurface';
import { calculateRoute } from '@/services/api';
interface Props {
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string;
  workerLat?: number;
  workerLng?: number;
  startLat?: number;
  startLng?: number;
  bookingId?: string;
}
export const BookingMap = React.memo(function BookingMap({
  destinationLat,
  destinationLng,
  destinationAddress,
  workerLat,
  workerLng,
  startLat,
  startLng,
  bookingId,
}: Props) {
  const [route, setRoute] = useState<any>(null);
  const [eta, setEta] = useState<number | null>(null);
  const routeLat = workerLat ?? startLat;
  const routeLng = workerLng ?? startLng;
  useEffect(() => {
    if (routeLat == null || routeLng == null) return;
    let active = true;
    calculateRoute(
      [routeLng, routeLat],
      [destinationLng, destinationLat],
      bookingId,
    )
      .then((value) => {
        if (active) {
          setRoute(value.geojson);
          setEta(value.durationSeconds);
        }
      })
      .catch(() => {
        if (active) {
          setRoute(null);
          setEta(null);
        }
      });
    return () => {
      active = false;
    };
  }, [bookingId, destinationLat, destinationLng, routeLat, routeLng]);
  const current = {
    latitude: routeLat ?? destinationLat,
    longitude: routeLng ?? destinationLng,
  };
  const points = [
    ...(startLat != null && startLng != null
      ? [
          {
            id: 'start',
            latitude: startLat,
            longitude: startLng,
            color: '#7C3AED',
          },
        ]
      : []),
    ...(workerLat != null && workerLng != null
      ? [
          {
            id: 'worker',
            latitude: workerLat,
            longitude: workerLng,
            color: Colors.cta,
          },
        ]
      : []),
    {
      id: 'destination',
      latitude: destinationLat,
      longitude: destinationLng,
      color: Colors.error,
    },
  ];
  return (
    <View style={styles.container}>
      <MapSurface
        center={{
          latitude: (current.latitude + destinationLat) / 2,
          longitude: (current.longitude + destinationLng) / 2,
        }}
        points={points}
        route={route ?? undefined}
      />
      <View style={styles.startBadge}>
        <View style={styles.startDot} />
        <AppText variant="caption">Starting from</AppText>
      </View>
      <View style={styles.etaBadge}>
        <AppText variant="h4" color={Colors.cta}>
          {eta == null ? '—' : `${Math.max(1, Math.ceil(eta / 60))} Min`}
        </AppText>
        <AppText variant="caption" color={Colors.textSecondary}>
          ETA
        </AppText>
      </View>
      <View style={styles.addressBadge}>
        <MapPin size={14} color={Colors.error} />
        <AppText
          variant="caption"
          color={Colors.textPrimary}
          style={{ flex: 1 }}
        >
          {destinationAddress}
        </AppText>
      </View>
    </View>
  );
});
const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    height: 220,
    position: 'relative',
    ...Elevation.sm,
  },
  startBadge: {
    position: 'absolute',
    top: Spacing['2'],
    left: Spacing['2'],
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing['2'],
    paddingVertical: Spacing['1'],
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    ...Elevation.sm,
  },
  startDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
  },
  etaBadge: {
    position: 'absolute',
    top: Spacing['2'],
    right: Spacing['2'],
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['1'],
    borderRadius: Radius.lg,
    alignItems: 'center',
    ...Elevation.sm,
  },
  addressBadge: {
    position: 'absolute',
    bottom: Spacing['2'],
    left: Spacing['2'],
    right: Spacing['2'],
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: Spacing['2'],
    paddingVertical: Spacing['1'],
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
