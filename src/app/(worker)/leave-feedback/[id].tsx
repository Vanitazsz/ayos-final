import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import { QUICK_TAGS, RATING_LABELS } from '@/constants/workerFeedback';
import {
  ArrowLeft,
  Star,
  Check,
  User,
  CheckCircle2,
  MessageSquare,
  ThumbsUp,
} from 'lucide-react-native';
import { fetchWorkerBookingById, type WorkerBooking } from '@/services/api';
import {
  submitWorkerFeedback,
  getWorkerFeedback,
} from '@/services/workerFeedback';
import { showAlert } from '@/components/AppAlert';

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
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    let isMounted = true;
    void (async () => {
      try {
        const result = await fetchWorkerBookingById(bookingId);
        if (isMounted && result.data) {
          setBooking(result.data);
        }
        const existing = await getWorkerFeedback(bookingId);
        if (isMounted && existing) {
          setSubmitted(true);
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
      showAlert('Rating Required', 'Please select at least 1 star.');
      return;
    }
    if (!bookingId) {
      showAlert('Error', 'Missing booking identifier.');
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
      setSubmitted(true);
      showAlert(
        'Feedback Submitted',
        `Thank you! Your feedback for ${booking?.customerName ?? 'the customer'} has been saved successfully.`,
        [
          {
            text: 'OK',
            onPress: () =>
              router.replace('/(worker)/bookings?filter=Completed'),
          },
        ],
      );
    } catch (error) {
      showAlert(
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
    <Screen
      scrollable
      keyboardAvoiding={false}
      contentContainerStyle={{ paddingBottom: 80 }}
      style={[styles.screen, { paddingBottom: 0 }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={[theme.typography.h4, styles.headerTitle]}>
          Worker Feedback
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loadingBooking ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading booking info...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {submitted ? (
            <View style={styles.doneCard}>
              <View style={styles.doneIcon}>
                <CheckCircle2 size={40} color={theme.colors.success} />
              </View>
              <Text style={[theme.typography.h3, styles.doneTitle]}>
                Feedback Submitted
              </Text>
              <Text style={styles.doneSubtitle}>
                You&apos;ve already left feedback for this customer.
              </Text>

              <View style={styles.doneStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    color={
                      star <= rating
                        ? theme.colors.warning
                        : theme.colors.border
                    }
                    size={28}
                    fill={star <= rating ? theme.colors.warning : 'transparent'}
                  />
                ))}
              </View>
              <Text style={styles.ratingLabelText}>
                {RATING_LABELS[rating] ?? ''}
              </Text>

              {selectedTags.length > 0 ? (
                <View style={styles.doneTags}>
                  {selectedTags.map((tag) => (
                    <View key={tag} style={styles.doneTagChip}>
                      <Text style={styles.doneTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {comment.trim() ? (
                <Text style={styles.doneComment}>{comment}</Text>
              ) : null}

              <View style={styles.doneFooter}>
                <Button
                  title="Back to Bookings"
                  onPress={() =>
                    router.replace('/(worker)/bookings?filter=Completed')
                  }
                  fullWidth
                />
              </View>
            </View>
          ) : (
            <>
              {/* Customer Info */}
              <View style={styles.card}>
                <View style={styles.customerHeader}>
                  <View style={styles.avatarCircle}>
                    <User size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.customerDetails}>
                    <Text style={theme.typography.h4}>
                      {booking?.customerName ?? 'Customer'}
                    </Text>
                    <Text style={styles.customerSub}>
                      {booking?.service ?? 'Completed Service'}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaDivider} />

                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>
                    Date: {booking?.date ?? 'Recently completed'}
                  </Text>
                  <Text style={styles.metaValue}>{booking?.price ?? ''}</Text>
                </View>
              </View>

              {/* Star Rating */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Star size={18} color={theme.colors.primary} />
                  <Text style={[theme.typography.h4, styles.sectionTitle]}>
                    Rate Customer Experience
                  </Text>
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
                          star <= rating
                            ? theme.colors.warning
                            : theme.colors.border
                        }
                        size={38}
                        fill={
                          star <= rating ? theme.colors.warning : 'transparent'
                        }
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.ratingLabelText}>
                  {RATING_LABELS[rating] ?? ''}
                </Text>
              </View>

              {/* Quick Compliments */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <ThumbsUp size={18} color={theme.colors.primary} />
                  <Text style={[theme.typography.h4, styles.sectionTitle]}>
                    Quick Compliments
                  </Text>
                </View>
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

              {/* Feedback / Notes */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <MessageSquare size={18} color={theme.colors.primary} />
                  <Text style={[theme.typography.h4, styles.sectionTitle]}>
                    Feedback / Notes
                  </Text>
                </View>
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
            </>
          )}
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
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    color: theme.colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    paddingVertical: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  content: {
    flex: 1,
    paddingBottom: theme.spacing.xxxl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
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
  customerSub: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
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
  metaKey: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  metaValue: {
    ...theme.typography.body1,
    color: theme.colors.success,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
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
    backgroundColor: theme.colors.background,
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
  doneCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.successBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  doneTitle: {
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  doneSubtitle: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  doneStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  doneTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  doneTagChip: {
    backgroundColor: theme.colors.infoBackground,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  doneTagText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  doneComment: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: theme.spacing.md,
  },
  doneFooter: {
    alignSelf: 'stretch',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
});
