import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable, Image } from 'react-native';
import { MapPin, Clock } from 'lucide-react-native';
import { Colors, Radius, Spacing, Elevation } from '@/constants/theme';
import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { RatingStars } from './RatingStars';
import * as Haptics from 'expo-haptics';

export interface ProviderData {
  id: string;
  name: string;
  category: string;
  avatarUri: string;
  rating: number;
  reviewCount: number;
  distance: string;
  eta: string;
  verified: boolean;
  price?: string;
  estimatedPrice?: string;
}

interface ProviderCardProps {
  provider: ProviderData;
  onPress?: () => void;
  style?: ViewStyle;
  compact?: boolean;
}

export const ProviderCard = React.memo(function ProviderCard({
  provider,
  onPress,
  style,
  compact = false,
}: ProviderCardProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        Elevation.sm,
        { opacity: pressed ? 0.95 : 1 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${provider.name}, ${provider.category}`}
    >
      <View style={styles.headerRow}>
        <Avatar uri={provider.avatarUri} size={compact ? 44 : 52} />
        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <AppText variant="body" weight="bold" color={Colors.textPrimary} numberOfLines={1}>
              {provider.name}
            </AppText>
            {provider.verified && <Badge label="Verified" variant="verified" />}
          </View>
          <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>
            {provider.category}
          </AppText>
          <View style={styles.ratingRow}>
            <RatingStars rating={provider.rating} size={13} showValue reviewCount={provider.reviewCount} />
          </View>
        </View>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MapPin size={14} color={Colors.textSecondary} />
          <AppText variant="caption" color={Colors.textSecondary}>
            {provider.distance}
          </AppText>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Clock size={14} color={Colors.textSecondary} />
          <AppText variant="caption" color={Colors.textSecondary}>
            {provider.eta}
          </AppText>
        </View>
        {provider.price && (
          <AppText variant="bodySm" weight="bold" color={Colors.cta} style={styles.price}>
            {provider.price}
          </AppText>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    padding: Spacing['4'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing['3'],
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    flexWrap: 'wrap',
  },
  ratingRow: {
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing['3'],
    paddingTop: Spacing['3'],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing['3'],
  },
  price: {
    marginLeft: 'auto',
  },
});
