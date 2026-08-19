import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { MapPin } from 'lucide-react-native';
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
  status?: 'pending' | 'accepted' | 'declined';
  onAccept?: () => void;
  onDecline?: () => void;
  onPress?: () => void;
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
  onPress,
}: DispatchOfferProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
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

      {status === 'accepted' ? (
        <View style={styles.feedbackAccepted}>
          <AppText style={styles.feedbackAcceptedText}>✓ Request accepted</AppText>
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
    </Pressable>
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
  feedbackAccepted: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.successBackground,
    borderWidth: 1.5,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  feedbackAcceptedText: {
    color: theme.colors.success,
    fontWeight: '600',
    fontSize: 14,
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
