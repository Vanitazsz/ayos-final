import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Star } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppText } from './AppText';

interface RatingStarsProps {
  rating: number;
  size?: number;
  showValue?: boolean;
  reviewCount?: number;
  color?: string;
  style?: ViewStyle;
}

export const RatingStars = React.memo(function RatingStars({
  rating,
  size = 16,
  showValue = false,
  reviewCount,
  color = Colors.star,
  style,
}: RatingStarsProps) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const roundedUp = rating - fullStars >= 0.75;

  const renderStars = () => {
    const stars: React.ReactNode[] = [];
    const totalStars = 5;
    const filled = roundedUp ? fullStars + 1 : fullStars;

    for (let i = 0; i < totalStars; i++) {
      const isFilled = i < filled;
      const isHalf = !roundedUp && hasHalf && i === fullStars;
      stars.push(
        <View key={i} style={styles.starContainer}>
          <Star size={size} color={color} fill={isFilled ? color : 'transparent'} strokeWidth={isFilled ? 0 : 1.5} />
          {isHalf && (
            <View style={styles.halfStarOverlay}>
              <Star size={size} color={color} fill={color} strokeWidth={0} />
            </View>
          )}
        </View>,
      );
    }
    return stars;
  };

  return (
    <View style={[styles.container, style]}>
      {renderStars()}
      {showValue && (
        <AppText variant="bodySm" weight="semiBold" color={Colors.textPrimary} style={styles.ratingValue}>
          {rating.toFixed(1)}
        </AppText>
      )}
      {reviewCount !== undefined && (
        <AppText variant="caption" color={Colors.textSecondary} style={styles.reviewCount}>
          ({reviewCount})
        </AppText>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starContainer: {
    position: 'relative',
  },
  halfStarOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '50%',
    overflow: 'hidden',
  },
  ratingValue: {
    marginLeft: Spacing['1'],
  },
  reviewCount: {
    marginLeft: 2,
  fontSize: 12,
  fontWeight: '400',
  color: Colors.textSecondary,
  marginTop: 0,
  marginBottom: 0,
  lineHeight: 16,
  padding: 0,
    includeFontPadding: false,
  textAlignVertical: 'center',
  },
});
