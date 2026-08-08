import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { useBookingRoute } from '@/hooks/useBookingRoute';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = {
  bookingId?: string;
  startLat?: number | null;
  startLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  destinationAddress: string;
  workerView?: boolean;
};

const haversineKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export function RouteSummaryCard({
  bookingId,
  startLat,
  startLng,
  destinationLat,
  destinationLng,
  destinationAddress,
  workerView,
}: Props) {
  const routeResult = useBookingRoute({
    bookingId,
    startLat,
    startLng,
    destinationLat,
    destinationLng,
  });

  const directDistance =
    startLat == null ||
    startLng == null ||
    destinationLat == null ||
    destinationLng == null
      ? null
      : haversineKm(startLat, startLng, destinationLat, destinationLng);

  const distanceKm =
    routeResult?.distanceMeters != null
      ? routeResult.distanceMeters / 1000
      : directDistance;

  const minutes =
    routeResult?.etaSeconds != null
      ? Math.max(1, Math.ceil(Number(routeResult.etaSeconds) / 60))
      : directDistance != null
        ? Math.max(1, Math.round((directDistance / 25) * 60))
        : null;

  if (
    startLat == null ||
    startLng == null ||
    destinationLat == null ||
    destinationLng == null
  )
    return null;
  return (
    <View style={styles.card}>
      <View style={styles.title}>
        <MapPin size={17} color={Colors.cta} />
        <AppText variant="body" weight="semiBold">
          Route summary
        </AppText>
      </View>
      {distanceKm != null && (
        <AppText variant="bodySm" color={Colors.cta} style={styles.distance}>
          {workerView ? 'Your service location' : 'Worker'} is{' '}
          {distanceKm.toFixed(1)} km away
        </AppText>
      )}
      <AppText variant="caption" color={Colors.textSecondary}>
        From: {routeResult?.startAddress ?? 'Worker starting location'}
      </AppText>
      <AppText variant="caption" color={Colors.textSecondary}>
        To: {destinationAddress || 'Customer service location'}
      </AppText>
      <AppText variant="caption" weight="semiBold">
        Distance:{' '}
        {distanceKm == null ? '—' : `${distanceKm.toFixed(1)} km`}{' '}
        | Est. travel: {minutes == null ? '—' : `${minutes} min`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing['4'],
    marginVertical: Spacing['3'],
    padding: Spacing['4'],
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing['2'],
  },
  title: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  distance: { marginBottom: Spacing['1'] },
});
