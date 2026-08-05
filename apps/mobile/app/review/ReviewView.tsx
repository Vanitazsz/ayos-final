import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { TextInput } from '@/components/inputs/TextInput';
import { theme } from '@/constants/theme';
import {
  ArrowLeft,
  Star,
  UploadCloud,
  X,
  AlertCircle,
  Info,
} from 'lucide-react-native';
import { styles } from './review.styles';
import { useReviewController } from './useReviewController';

export function ReviewView(
  props: ReturnType<typeof useReviewController>,
) {
  const {
    booking,
    rating,
    setRating,
    review,
    setReview,
    recommend,
    setRecommend,
    photos,
    handleUpload,
    removePhoto,
    loading,
    ratingError,
    reviewError,
    handleSubmit,
    handleSkip,
  } = props;

  return (
    <Screen safeArea scrollable>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.layout.screenPadding },
        ]}
      >
        <TouchableOpacity onPress={handleSkip} style={styles.backButton}>
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text
          style={[theme.typography.h4, { color: theme.colors.textPrimary }]}
        >
          Rate Service
        </Text>
        <TouchableOpacity onPress={handleSkip}>
          <Text
            style={[theme.typography.button, { color: theme.colors.primary }]}
          >
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.content,
          { paddingHorizontal: theme.layout.screenPadding },
        ]}
      >
        {/* Worker Summary */}
        <View style={styles.workerInfo}>
          <View style={styles.avatarPlaceholder} />
          <Text
            style={[theme.typography.h3, { marginBottom: theme.spacing.xs }]}
          >
            {booking?.worker_profiles?.display_name ?? 'Service Provider'}
          </Text>
          <Text
            style={[
              theme.typography.body2,
              { color: theme.colors.textSecondary },
            ]}
          >
            {booking?.service_requests?.service_categories?.name ?? 'Service'}{' '}
            •{' '}
            {booking?.completed_at
              ? new Date(booking.completed_at).toLocaleDateString()
              : 'Completed'}
          </Text>
        </View>

        {/* Top Informational Banner */}
        <View style={styles.requiredNoticeCard}>
          <Info color="#1e40af" size={18} />
          <Text style={styles.requiredNoticeText}>
            Fields marked with <Text style={styles.requiredAsterisk}>*</Text>{' '}
            are required to submit your review.
          </Text>
        </View>

        {/* Section 1: Rating (Required) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[theme.typography.h4, styles.sectionTitle]}>
            How was the service? <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredBadgeText}>Required</Text>
          </View>
        </View>

        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starBtn}
              activeOpacity={0.7}
            >
              <Star
                color={
                  star <= rating ? theme.colors.warning : theme.colors.border
                }
                size={40}
                fill={star <= rating ? theme.colors.warning : 'transparent'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {ratingError && (
          <View style={styles.errorBanner}>
            <AlertCircle color={theme.colors.error} size={16} />
            <Text style={styles.errorText}>{ratingError}</Text>
          </View>
        )}

        {/* Section 2: Review Text (Required) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[theme.typography.h4, styles.sectionTitle]}>
            Write a Review <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredBadgeText}>Required</Text>
          </View>
        </View>

        <TextInput
          placeholder="Share at least 3 characters about your experience"
          multiline
          numberOfLines={4}
          value={review}
          onChangeText={setReview}
          style={[styles.textArea, reviewError ? styles.textAreaError : null]}
          textAlignVertical="top"
        />

        {reviewError && (
          <View style={styles.errorBanner}>
            <AlertCircle color={theme.colors.error} size={16} />
            <Text style={styles.errorText}>{reviewError}</Text>
          </View>
        )}

        {/* Section 3: Add Photos (Optional) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[theme.typography.h4, styles.sectionTitle]}>
            Add Photos
          </Text>
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalBadgeText}>Optional</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoScroll}
        >
          {photos.length < 3 && (
            <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
              <UploadCloud color={theme.colors.primary} size={32} />
            </TouchableOpacity>
          )}
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoPreview}>
              <Image source={{ uri: photo }} style={styles.reviewImage} />
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={() => removePhoto(index)}
              >
                <X color={theme.colors.surface} size={14} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {/* Section 4: Recommend Worker */}
        <View style={styles.recommendContainer}>
          <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
            <Text style={theme.typography.h4}>Recommend Worker</Text>
            <Text
              style={[
                theme.typography.body2,
                { color: theme.colors.textSecondary },
              ]}
            >
              Would you recommend this professional to others?
            </Text>
          </View>
          <Switch
            value={recommend}
            onValueChange={setRecommend}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.surface}
          />
        </View>

        {/* Submit Footer Button */}
        <View style={styles.footer}>
          <Button
            title="Submit Review"
            onPress={handleSubmit}
            loading={loading}
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
}
