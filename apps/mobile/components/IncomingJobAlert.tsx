import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Colors, Radius, Spacing, Elevation, Layout } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { PulsingDot } from '@/components/PulsingDot';

interface IncomingJobAlertProps {
  service: string;
  location: string;
  distance: string;
  postedTime: string;
  onAccept?: () => void;
  onMoreDetails?: () => void;
}

export const IncomingJobAlert = React.memo(function IncomingJobAlert({
  service,
  location,
  distance,
  postedTime,
  onAccept = () => {},
  onMoreDetails = () => {},
}: IncomingJobAlertProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <PulsingDot color={Colors.warning} size={8} />
          <AppText variant="overline" color={Colors.warning}>
            NEW BOOKING REQUEST
          </AppText>
        </View>
        <AppText variant="caption" color={Colors.textTertiary}>
          {postedTime}
        </AppText>
      </View>

      <AppText variant="body" weight="semiBold" color={Colors.textPrimary} style={styles.service}>
        {service}
      </AppText>

      <View style={styles.locationRow}>
        <MapPin size={14} color={Colors.textSecondary} />
        <AppText variant="caption" color={Colors.textSecondary}>
          {location} · {distance}
        </AppText>
      </View>

      <View style={styles.actions}>
        <AppButton
          label="Accept"
          variant="primary"
          size="sm"
          onPress={onAccept}
          style={styles.acceptBtn}
        />
        <AppButton
          label="More Details"
          variant="outline"
          size="sm"
          onPress={onMoreDetails}
          style={styles.detailsBtn}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Layout.cardPadding,
    ...Elevation.sm,
    borderWidth: 1.5,
    borderColor: Colors.warning,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing['3'],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  service: {
    marginBottom: Spacing['2'],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
    marginBottom: Spacing['4'],
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing['3'],
  },
  acceptBtn: {
    flex: 1,
  },
  detailsBtn: {
    flex: 1,
  },
});
