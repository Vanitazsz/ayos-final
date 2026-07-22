import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { Colors, Radius, Spacing, Elevation } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';

interface CompletedSummaryProps {
  bookingId: string;
  duration: string;
  earnings: string;
  onLeaveFeedback: () => void;
}

export const CompletedSummary = React.memo(function CompletedSummary({
  bookingId,
  duration,
  earnings,
  onLeaveFeedback,
}: CompletedSummaryProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconRow}>
        <CheckCircle2 size={48} color={Colors.success} />
      </View>

      <AppText variant="h3" weight="bold" color={Colors.success} style={styles.title}>
        Job Completed!
      </AppText>

      <AppText variant="body" color={Colors.textSecondary} style={styles.subtitle}>
        Your payment has been released.
      </AppText>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <AppText variant="body" color={Colors.textTertiary}>Booking ID</AppText>
          <AppText variant="body" weight="semiBold">#{bookingId.padStart(4, '0')}</AppText>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <AppText variant="body" color={Colors.textTertiary}>Duration</AppText>
          <AppText variant="body" weight="semiBold">{duration}</AppText>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <AppText variant="body" color={Colors.textTertiary}>Earnings</AppText>
          <AppText variant="body" weight="bold" color={Colors.success}>{earnings}</AppText>
        </View>
      </View>

      <AppButton
        label="Leave Feedback"
        variant="outline"
        fullWidth
        onPress={onLeaveFeedback}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['6'],
    alignItems: 'center',
    gap: Spacing['2'],
    ...Elevation.sm,
  },
  iconRow: {
    marginBottom: Spacing['1'],
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing['3'],
  },
  summaryCard: {
    width: '100%',
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.lg,
    padding: Spacing['4'],
    gap: Spacing['2'],
    marginBottom: Spacing['2'],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
});
