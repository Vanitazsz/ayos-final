import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Colors, Radius, Spacing, Elevation } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { MapSurface } from '@/components/maps/MapSurface';
import { useBookingRoute } from '@/hooks/useBookingRoute';
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
  const routeLat = workerLat ?? startLat;
  const routeLng = workerLng ?? startLng;
  const routeResult = useBookingRoute({
    startLat: routeLat,
    startLng: routeLng,
    destinationLat,
    destinationLng,
    bookingId,
  });
  const route = routeResult?.route ?? null;
  const eta = routeResult?.etaSeconds ?? null;
  const current = {
    latitude: routeLat ?? destinationLat,
    longitude: routeLng ?? destinationLng,
  };
  const safeLat = (v: number) => (Number.isFinite(v) ? v : destinationLat);
  const safeLng = (v: number) => (Number.isFinite(v) ? v : destinationLng);
  const centerLat = safeLat((current.latitude + destinationLat) / 2);
  const centerLng = safeLng((current.longitude + destinationLng) / 2);
  const points = [
    ...(workerLat != null && workerLng != null && Number.isFinite(workerLat) && Number.isFinite(workerLng)
      ? [
          {
            id: 'worker',
            latitude: workerLat,
            longitude: workerLng,
            color: Colors.cta,
            label: 'Worker',
          },
        ]
      : []),
    {
      id: 'destination',
      latitude: destinationLat,
      longitude: destinationLng,
      color: Colors.error,
      label: 'User',
    },
  ];
  if (
    !Number.isFinite(destinationLat) ||
    !Number.isFinite(destinationLng)
  )
    return null;
  return (
    <View style={styles.container}>
      <MapSurface
        center={{
          latitude: centerLat,
          longitude: centerLng,
        }}
        points={points}
        route={route ?? undefined}
      />
      <View style={styles.legendBadge}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
          <AppText variant="caption" weight="semiBold" color={Colors.textPrimary}>User</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.cta }]} />
          <AppText variant="caption" weight="semiBold" color={Colors.textPrimary}>Worker</AppText>
        </View>
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
  legendBadge: {
    position: 'absolute',
    top: Spacing['2'],
    left: Spacing['2'],
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: Spacing['1'],
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Elevation.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
