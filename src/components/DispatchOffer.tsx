import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { MapPin, Loader2, XCircle } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { PulsingDot } from '@/components/PulsingDot';

interface DispatchOfferProps {
  category: string;
  area: string;
  distance: string;
  budget: string;
  postedTime: string;
  description: string;
  status?: 'pending' | 'waiting' | 'not_selected' | 'declined';
  onAccept?: () => void;
  onDecline?: () => void;
}

export const DispatchOffer = React.memo(function DispatchOffer({
  category,
  area,
  distance,
  budget,
  postedTime,
  description,
  status = 'pending',
  onAccept = () => {},
  onDecline = () => {},
}: DispatchOfferProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'waiting') {
      const loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      );
      loop.start();
      return () => loop.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [status, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <PulsingDot color={theme.colors.primary} size={8} />
        <AppText variant="overline" color={theme.colors.primary}>
          Nearby {category} request
        </AppText>
      </View>

      <View style={styles.divider} />

      <AppText style={styles.title} numberOfLines={3}>
        {description}
      </AppText>

      <View style={styles.locationRow}>
        <MapPin size={14} color={theme.colors.textSecondary} />
        <AppText variant="caption" color={theme.colors.textSecondary}>
          {area}
        </AppText>
      </View>

      <View style={styles.infoStrip}>
        <View style={styles.infoCol}>
          <AppText style={styles.infoLabel}>Distance</AppText>
          <AppText style={styles.infoValue}>{distance}</AppText>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoCol}>
          <AppText style={styles.infoLabel}>Offer</AppText>
          <AppText style={styles.infoValue}>{budget}</AppText>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoCol}>
          <AppText style={styles.infoLabel}>Posted</AppText>
          <AppText style={styles.infoValue}>{postedTime}</AppText>
        </View>
      </View>

      {status === 'waiting' ? (
        <View style={styles.feedbackWaiting}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Loader2 size={18} color={theme.colors.warning} />
          </Animated.View>
          <View style={styles.feedbackWaitingTextWrap}>
            <AppText style={styles.feedbackWaitingTitle}>
              Waiting for customer to choose...
            </AppText>
            <AppText style={styles.feedbackWaitingSub}>
              You'll be notified when selected.
            </AppText>
          </View>
        </View>
      ) : status === 'not_selected' ? (
        <View style={styles.feedbackNotSelected}>
          <XCircle size={18} color={theme.colors.textTertiary} />
          <View style={styles.feedbackWaitingTextWrap}>
            <AppText style={styles.feedbackNotSelectedTitle}>
              Customer chose another worker
            </AppText>
            <AppText style={styles.feedbackNotSelectedSub}>
              Better luck next time.
            </AppText>
          </View>
        </View>
      ) : status === 'declined' ? (
        <View style={styles.feedbackDeclined}>
          <AppText style={styles.feedbackDeclinedText}>Request declined</AppText>
        </View>
      ) : (
        <View style={styles.buttonRow}>
          <AppButton
            label="Decline"
            variant="outline"
            size="sm"
            onPress={(e: any) => { e.stopPropagation?.(); onDecline(); }}
            labelStyle={{ color: theme.colors.error }}
            style={styles.btnDecline}
            pressedStyle={{ backgroundColor: theme.colors.errorBackground }}
          />
          <AppButton
            label="Accept request"
            variant="primary"
            size="sm"
            onPress={(e: any) => { e.stopPropagation?.(); onAccept(); }}
            style={styles.btnAccept}
          />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.md,
  },
  title: {
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  infoCol: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginBottom: 2,
  },
  infoValue: {
    ...theme.typography.body2,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  infoDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.borderLight,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  btnDecline: {
    flex: 1,
    borderColor: theme.colors.error,
  },
  btnAccept: {
    flex: 2,
  },
  feedbackWaiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.warningBackground,
    borderWidth: 1.5,
    borderColor: 'rgba(234,179,8,0.3)',
  },
  feedbackWaitingTextWrap: {
    flex: 1,
  },
  feedbackWaitingTitle: {
    color: '#92400e',
    fontWeight: '600',
    fontSize: 14,
  },
  feedbackWaitingSub: {
    color: '#92400e',
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },
  feedbackNotSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.borderLight,
  },
  feedbackNotSelectedTitle: {
    color: theme.colors.textTertiary,
    fontWeight: '600',
    fontSize: 14,
  },
  feedbackNotSelectedSub: {
    color: theme.colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },
  feedbackDeclined: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.borderLight,
  },
  feedbackDeclinedText: {
    color: theme.colors.textTertiary,
    fontWeight: '600',
    fontSize: 14,
  },
});
