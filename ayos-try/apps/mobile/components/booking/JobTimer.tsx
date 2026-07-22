import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';
import { Colors, Radius, Spacing, Elevation } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { useWorkerBookingStore } from '@/store/useWorkerBookingStore';

interface JobTimerProps {
  hourlyRate: number;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const JobTimer = React.memo(function JobTimer({ hourlyRate }: JobTimerProps) {
  const elapsedSeconds = useWorkerBookingStore((s) => s.elapsedSeconds);
  const timerStart = useWorkerBookingStore((s) => s.timerStart);
  const tick = useWorkerBookingStore((s) => s.tick);

  useEffect(() => {
    if (!timerStart) return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timerStart, tick]);

  const hours = elapsedSeconds / 3600;
  const earnings = hourlyRate * hours;

  return (
    <View style={styles.container}>
      <View style={styles.timerHeader}>
        <Clock size={20} color={Colors.cta} />
        <AppText variant="bodySm" weight="semiBold" color={Colors.textSecondary}>
          Job Timer
        </AppText>
      </View>

      <View style={styles.timerDisplay}>
        <AppText variant="h1" weight="bold" color={Colors.textPrimary} style={styles.timeText}>
          {formatTime(elapsedSeconds)}
        </AppText>
      </View>

      <View style={styles.earningsRow}>
        <AppText variant="body" color={Colors.textSecondary}>Earnings</AppText>
        <AppText variant="h3" weight="bold" color={Colors.success}>
          ${earnings.toFixed(2)}
        </AppText>
      </View>

      <AppText variant="caption" color={Colors.textTertiary} style={styles.rateText}>
        Rate: ${hourlyRate}/hr
      </AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['5'],
    alignItems: 'center',
    gap: Spacing['3'],
    ...Elevation.sm,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  timerDisplay: {
    paddingVertical: Spacing['2'],
  },
  timeText: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingTop: Spacing['3'],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  rateText: {
    marginTop: -Spacing['2'],
  },
});
