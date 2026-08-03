import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { useRouteSummary } from '@/features/bookings/hooks/useRouteSummary';
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

export function RouteSummaryCard({
  bookingId,
  startLat,
  startLng,
  destinationLat,
  destinationLng,
  destinationAddress,
  workerView,
}: Props) {
  const summary = useRouteSummary({
    bookingId,
    destinationLat,
    destinationLng,
    startLat,
    startLng,
  });

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
      {summary.distanceKm != null && (
        <AppText variant="bodySm" color={Colors.cta} style={styles.distance}>
          {workerView ? 'Your service location' : 'Worker'} is{' '}
          {summary.distanceKm.toFixed(1)} km away
        </AppText>
      )}
      <AppText variant="caption" color={Colors.textSecondary}>
        From: {summary.startAddress}
      </AppText>
      <AppText variant="caption" color={Colors.textSecondary}>
        To: {destinationAddress || 'Customer service location'}
      </AppText>
      <AppText variant="caption" weight="semiBold">
        Distance:{' '}
        {summary.distanceKm == null
          ? '—'
          : `${summary.distanceKm.toFixed(1)} km`}{' '}
        | Est. travel:{' '}
        {summary.minutes == null ? '—' : `${summary.minutes} min`}
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
