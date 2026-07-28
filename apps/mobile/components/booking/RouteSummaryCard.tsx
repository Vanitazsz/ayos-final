import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { calculateRoute, reverseGeocode } from '@/services/api';
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
  const [summary, setSummary] = useState({
    startAddress: 'Worker starting location',
    distanceKm: null as number | null,
    minutes: null as number | null,
  });

  useEffect(() => {
    if (
      startLat == null ||
      startLng == null ||
      destinationLat == null ||
      destinationLng == null
    )
      return;
    let active = true;
    const directDistance = haversineKm(
      startLat,
      startLng,
      destinationLat,
      destinationLng,
    );
    void Promise.all([
      reverseGeocode(startLat, startLng).catch(() => null),
      calculateRoute(
        [startLng, startLat],
        [destinationLng, destinationLat],
        bookingId,
      ).catch(() => null),
    ]).then(([geocode, route]) => {
      if (!active) return;
      setSummary({
        startAddress: geocode?.displayLabel ?? 'Worker starting location',
        distanceKm:
          Number(route?.distanceMeters ?? directDistance * 1000) / 1000,
        minutes:
          route?.durationSeconds == null
            ? Math.max(1, Math.round((directDistance / 25) * 60))
            : Math.max(1, Math.ceil(Number(route.durationSeconds) / 60)),
      });
    });
    return () => {
      active = false;
    };
  }, [bookingId, destinationLat, destinationLng, startLat, startLng]);

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
