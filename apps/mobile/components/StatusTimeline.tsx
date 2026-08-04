import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Check, Circle, Clock } from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import type { RequestStatus } from '@/store/useRequestStore';
import {
  TIMELINE_STEPS,
  getCurrentStepIndex,
} from './logic/StatusTimelineLogic';

interface StatusTimelineProps {
  status: RequestStatus;
}

export function StatusTimeline({ status }: StatusTimelineProps) {
  const steps = TIMELINE_STEPS;
  const currentIndex = getCurrentStepIndex(steps, status);

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isCompleted =
          currentIndex > index ||
          (currentIndex === index && status === 'Completed');
        const isActive = currentIndex === index && status !== 'Completed';
        const isPending = currentIndex < index;

        return (
          <View key={step.id} style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              {isCompleted ? (
                <View style={[styles.circle, styles.completedCircle]}>
                  <Check size={14} color={Colors.white} strokeWidth={3} />
                </View>
              ) : isActive ? (
                <View style={[styles.circle, styles.activeCircle]}>
                  <Clock size={14} color={Colors.cta} strokeWidth={2.5} />
                </View>
              ) : (
                <View style={[styles.circle, styles.pendingCircle]}>
                  <Circle
                    size={10}
                    color={Colors.border}
                    fill={Colors.border}
                  />
                </View>
              )}

              {/* Line connector */}
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.line,
                    isCompleted ? styles.completedLine : styles.pendingLine,
                  ]}
                />
              )}
            </View>

            <View style={styles.textContainer}>
              <AppText
                variant="bodySm"
                weight={isActive || isCompleted ? 'semiBold' : 'regular'}
                color={
                  isActive
                    ? Colors.cta
                    : isCompleted
                      ? Colors.textPrimary
                      : Colors.textTertiary
                }
              >
                {step.label}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing['4'],
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 48, // gives space for the line
  },
  iconContainer: {
    alignItems: 'center',
    width: 24,
    marginRight: Spacing['3'],
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  completedCircle: {
    backgroundColor: Colors.success,
  },
  activeCircle: {
    backgroundColor: Colors.primarySurface,
    borderWidth: 2,
    borderColor: Colors.cta,
  },
  pendingCircle: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  line: {
    position: 'absolute',
    top: 24,
    bottom: -8, // stretch to next circle
    width: 2,
    zIndex: 1,
  },
  completedLine: {
    backgroundColor: Colors.success,
  },
  pendingLine: {
    backgroundColor: Colors.borderLight,
  },
  textContainer: {
    flex: 1,
    paddingTop: 2, // align with center of circle
  },
});
