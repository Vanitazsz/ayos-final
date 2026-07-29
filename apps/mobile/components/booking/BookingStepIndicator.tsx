import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CheckCircle2, Circle, Dot } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppText } from '@/components/AppText';

const STEPS = [
  { key: 'hired', label: 'Hired' },
  { key: 'accepted', label: 'Chat' },
  { key: 'en_route', label: 'En Route' },
  { key: 'in_progress', label: 'Work' },
  { key: 'pending_review', label: 'Review' },
  { key: 'completed', label: 'Done' },
];

const STATUS_ORDER: Record<string, number> = {
  hired: 0,
  accepted: 1,
  en_route: 2,
  in_progress: 3,
  pending_review: 4,
  completed: 5,
  cancelled: -1,
};

interface BookingStepIndicatorProps {
  currentStatus: string;
}

export const BookingStepIndicator = React.memo(function BookingStepIndicator({
  currentStatus,
}: BookingStepIndicatorProps) {
  const currentIdx = STATUS_ORDER[currentStatus] ?? -1;

  return (
    <View style={styles.container}>
      {STEPS.map((step, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;

        return (
          <View key={step.key} style={styles.step}>
            {isDone ? (
              <View style={[styles.dot, styles.dotDone]}>
                <CheckCircle2 size={14} color={Colors.white} />
              </View>
            ) : isActive ? (
              <View style={[styles.dot, styles.dotActive]}>
                <Circle size={10} color={Colors.cta} fill={Colors.cta} />
              </View>
            ) : (
              <View style={[styles.dot, styles.dotPending]}>
                <Circle size={10} color={Colors.border} />
              </View>
            )}
            <AppText
              variant="caption"
              weight={isActive || isDone ? 'semiBold' : 'regular'}
              color={isActive ? Colors.cta : isDone ? Colors.textPrimary : Colors.textTertiary}
              style={styles.label}
            >
              {step.label}
            </AppText>
            {i < STEPS.length - 1 && (
              <View
                style={[
                  styles.line,
                  isDone ? styles.lineDone : styles.linePending,
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing['3'],
  },
  step: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing['1'],
    position: 'relative',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['1'],
  },
  dotDone: {
    backgroundColor: Colors.success,
  },
  dotActive: {
    backgroundColor: Colors.primarySurface,
    borderWidth: 2,
    borderColor: Colors.cta,
  },
  dotPending: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  line: {
    position: 'absolute',
    top: 12,
    left: '60%',
    right: '-60%',
    height: 2,
    zIndex: -1,
  },
  lineDone: {
    backgroundColor: Colors.success,
  },
  linePending: {
    backgroundColor: Colors.borderLight,
  },
  label: {
    textAlign: 'center',
  },
});
