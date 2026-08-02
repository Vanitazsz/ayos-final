import { styles } from './ReviewIdScreen.styles';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { LegacyButton as Button } from '@/components/AppButton';
import { LegacyTextInput as TextInput } from '@/components/AppInput';
import { theme } from '@/constants/theme';
import { ArrowLeft, Star, UploadCloud, X } from 'lucide-react-native';
import type { useReviewIdScreenController } from '../hooks/useReviewIdScreenController';

export function ReviewView({
  model,
}: {
  model: ReturnType<typeof useReviewIdScreenController>;
}) {
  const {
    router,
    rating,
    setRating,
    review,
    setReview,
    recommend,
    setRecommend,
    photos,
    setPhotos,
    loading,
    booking,
    handleSubmit,
    handleUpload,
  } = model;
  return (
    <Screen safeArea scrollable>
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.layout.screenPadding },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/home')}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text
          style={[theme.typography.h4, { color: theme.colors.textPrimary }]}
        >
          Rate Service
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/home')}>
          <Text
            style={[theme.typography.button, { color: theme.colors.primary }]}
          >
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.workerInfo}>
          <View style={styles.avatarPlaceholder} />
          <Text
            style={[theme.typography.h3, { marginBottom: theme.spacing.xs }]}
          >
            {booking?.worker_profiles?.display_name ?? ''}
          </Text>
          <Text
            style={[
              theme.typography.body2,
              { color: theme.colors.textSecondary },
            ]}
          >
            {booking?.service_requests?.service_categories?.name ?? 'Service'} •{' '}
            {booking?.completed_at
              ? new Date(booking.completed_at).toLocaleDateString()
              : ''}
          </Text>
        </View>

        <Text style={[theme.typography.h4, styles.sectionTitle]}>
          How was the service?
        </Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starBtn}
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

        <Text style={[theme.typography.h4, styles.sectionTitle]}>
          Write a Review
        </Text>
        <TextInput
          placeholder="Share at least 3 characters about your experience"
          multiline
          numberOfLines={4}
          value={review}
          onChangeText={setReview}
          style={styles.textArea}
          textAlignVertical="top"
        />

        <Text style={[theme.typography.h4, styles.sectionTitle]}>
          Add Photos (Optional)
        </Text>
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
                onPress={() => setPhotos(photos.filter((_, i) => i !== index))}
              >
                <X color={theme.colors.surface} size={14} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

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
      </View>

      <View style={styles.footer}>
        <Button
          title="Submit Review"
          onPress={handleSubmit}
          loading={loading}
          fullWidth
        />
      </View>
    </Screen>
  );
}
