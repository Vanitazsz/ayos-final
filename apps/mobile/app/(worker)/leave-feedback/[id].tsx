import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import { ArrowLeft, Star, Check, User } from 'lucide-react-native';
import { fetchWorkerBookings, type WorkerBooking } from '@/services/api';
import {
  submitWorkerFeedback,
  getWorkerFeedback,
} from '@/services/workerFeedback';

const QUICK_TAGS = [
  'Punctual',
  'Easy Communication',
  'Prompt Payment',
  'Respectful',
  'Clear Instructions',
  'Pleasant Experience',
];

const RATING_LABELS: Record<number, string> = {
  1: '1/5 - Poor Experience',
  2: '2/5 - Below Average',
  3: '3/5 - Average Customer',
  4: '4/5 - Good Customer',
  5: '5/5 - Excellent Customer!',
};

export default function WorkerLeaveFeedbackScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const bookingId = Array.isArray(id) ? id[0] : id;

  const [booking, setBooking] = useState<WorkerBooking | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Prompt Payment',
    'Easy Communication',
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    let isMounted = true;
    void (async () => {
      try {
        const result = await fetchWorkerBookings();
        const found = (result.data ?? []).find((b) => b.id === bookingId);
        if (isMounted && found) {
          setBooking(found);
        }
        const existing = await getWorkerFeedback(bookingId);
        if (isMounted && existing) {
          setRating(existing.rating);
          setComment(existing.comment);
          if (existing.tags.length > 0) setSelectedTags(existing.tags);
        }
      } catch (err) {
        console.warn('Error loading booking feedback info:', err);
      } finally {
        if (isMounted) setLoadingBooking(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select at least 1 star.');
      return;
    }
    if (!bookingId) {
      Alert.alert('Error', 'Missing booking identifier.');
      return;
    }

    setSubmitting(true);
    try {
      await submitWorkerFeedback(
        bookingId,
        rating,
        comment.trim(),
        selectedTags,
      );
      Alert.alert(
        'Feedback Submitted',
        `Thank you! Your feedback for ${booking?.customerName ?? 'the customer'} has been saved successfully.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(worker)/bookings?filter=Completed'),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Submission Error',
        error instanceof Error
          ? error.message
          : 'Could not save feedback. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen safeArea scrollable style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={[theme.typography.h4, { color: theme.colors.textPrimary }]}>
          Customer Feedback
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loadingBooking ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[
              theme.typography.body2,
              { color: theme.colors.textSecondary, marginTop: 12 },
            ]}
          >
            Loading booking info...
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Customer Info Card */}
          <View style={styles.card}>
            <View style={styles.customerHeader}>
              <View style={styles.avatarCircle}>
                <User size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.customerDetails}>
                <Text style={theme.typography.h4}>
                  {booking?.customerName ?? 'Customer'}
                </Text>
                <Text
                  style={[
                    theme.typography.body2,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {booking?.service ?? 'Completed Service'}
                </Text>
              </View>
            </View>

            <View style={styles.metaDivider} />

            <View style={styles.metaRow}>
              <Text
                style={[
                  theme.typography.caption,
                  { color: theme.colors.textTertiary },
                ]}
              >
                Date: {booking?.date ?? 'Recently completed'}
              </Text>
              <Text
                style={[
                  theme.typography.body1,
                  { color: theme.colors.success, fontWeight: '700' },
                ]}
              >
                {booking?.price ?? ''}
              </Text>
            </View>
          </View>

          {/* Star Rating */}
          <View style={styles.section}>
            <Text style={[theme.typography.h4, styles.sectionTitle]}>
              Rate Customer Experience
            </Text>
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
                    size={38}
                    fill={star <= rating ? theme.colors.warning : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingLabelText}>
              {RATING_LABELS[rating] ?? ''}
            </Text>
          </View>

          {/* Quick Tags */}
          <View style={styles.section}>
            <Text style={[theme.typography.h4, styles.sectionTitle]}>
              Quick Compliments
            </Text>
            <View style={styles.tagsGrid}>
              {QUICK_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagChip,
                      isSelected && styles.tagChipSelected,
                    ]}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.8}
                  >
                    {isSelected && (
                      <Check
                        size={14}
                        color={theme.colors.primary}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text
                      style={[
                        styles.tagChipText,
                        isSelected && styles.tagChipTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Comment input */}
          <View style={styles.section}>
            <Text style={[theme.typography.h4, styles.sectionTitle]}>
              Feedback / Notes (Optional)
            </Text>
            <TextInput
              placeholder="Write feedback about your experience with this customer..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
              style={styles.textArea}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.footer}>
            <Button
              title="Submit Feedback"
              onPress={handleSubmit}
              loading={submitting}
              fullWidth
            />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.layout.screenPadding,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  loadingContainer: {
    flex: 1,
    paddingVertical: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.layout.screenPadding,
    paddingBottom: theme.spacing.xxxl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.infoBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerDetails: { flex: 1, gap: 2 },
  metaDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  starBtn: {
    padding: theme.spacing.xs,
  },
  ratingLabelText: {
    ...theme.typography.body2,
    fontWeight: '600',
    color: theme.colors.primary,
    textAlign: 'center',
    marginTop: 4,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  tagChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.infoBackground,
  },
  tagChipText: {
    ...theme.typography.caption,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  tagChipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 110,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  footer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xxxl,
  },
});
