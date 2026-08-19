import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { CheckCircle2, Star, X } from 'lucide-react-native';
import { Colors, Radius, Spacing, Elevation } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { getWorkerFeedback } from '@/services/workerFeedback';
import {
  fetchBookingProofPhotos,
  type BookingProofPhoto,
} from '@/services/api';

interface CompletedSummaryProps {
  bookingId: string;
  duration: string;
  earnings: string;
  paymentStatus: string;
  commissionRatePercent?: number | null;
  commissionAmount?: number | null;
  onConfirmCash: (method?: 'CASH' | 'ONLINE_SIMULATED') => void;
}

export const CompletedSummary = React.memo(function CompletedSummary({
  bookingId,
  duration,
  earnings,
  paymentStatus,
  commissionRatePercent,
  commissionAmount,
  onConfirmCash,
}: CompletedSummaryProps) {
  const paymentConfirmed = paymentStatus === 'SUCCESSFUL';
  const [feedback, setFeedback] = useState<{
    rating: number;
    comment: string;
    tags: string[];
  } | null>(null);
  const [proofPhotos, setProofPhotos] = useState<BookingProofPhoto[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void getWorkerFeedback(bookingId)
      .then((result) => {
        if (isMounted && result) {
          setFeedback({
            rating: result.rating,
            comment: result.comment,
            tags: result.tags,
          });
        }
      })
      .catch((error) => {
        console.warn('Failed to load worker feedback:', error);
      });
    void fetchBookingProofPhotos(bookingId)
      .then((photos) => {
        if (isMounted) setProofPhotos(photos);
      })
      .catch((error) => {
        console.warn('Failed to load booking proof photos:', error);
      });
    return () => {
      isMounted = false;
    };
  }, [bookingId]);
  const MAX_ID_LENGTH = 14;
  const paddedId = bookingId.padStart(4, '0');
  const displayId =
    paddedId.length > MAX_ID_LENGTH
      ? `${paddedId.slice(0, MAX_ID_LENGTH - 3)}...`
      : paddedId;
  return (
    <View style={styles.container}>
      <View style={styles.iconRow}>
        <CheckCircle2 size={48} color={Colors.success} />
      </View>

      <AppText
        variant="h3"
        weight="bold"
        color={Colors.success}
        style={styles.title}
      >
        Job Completed!
      </AppText>

      <AppText
        variant="body"
        color={Colors.textSecondary}
        style={styles.subtitle}
      >
        {paymentConfirmed
          ? 'Payment and platform commission deduction have been recorded.'
          : 'Mark customer payment as received to complete the server-calculated commission deduction.'}
      </AppText>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <AppText variant="body" color={Colors.textTertiary}>
            Booking ID
          </AppText>
          <AppText
            variant="body"
            weight="semiBold"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.idValue}
          >
            #{displayId}
          </AppText>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <AppText variant="body" color={Colors.textTertiary}>
            Duration
          </AppText>
          <AppText variant="body" weight="semiBold">
            {duration}
          </AppText>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <AppText variant="body" color={Colors.textTertiary}>
            Service Amount
          </AppText>
          <AppText variant="body" weight="bold" color={Colors.success}>
            {earnings}
          </AppText>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <AppText variant="body" color={Colors.textTertiary}>
            {commissionRatePercent == null
              ? 'Platform Commission'
              : `Platform Commission (${commissionRatePercent.toFixed(2)}%)`}
          </AppText>
          <AppText variant="body" weight="bold" color={Colors.error}>
            {commissionAmount == null
              ? 'Calculated by server'
              : `-₱${commissionAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
          </AppText>
        </View>
        {(feedback || proofPhotos.length > 0) && (
          <>
            <View style={styles.divider} />
            <View style={styles.feedbackBlock}>
              <AppText variant="body" color={Colors.textTertiary}>
                Feedback
              </AppText>
              {proofPhotos.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mediaRow}
                >
                  {proofPhotos.map((photo, index) => (
                    <View key={photo.id} style={styles.photoThumb}>
                      {photo.signedUrl && (
                        <Image
                          source={{ uri: photo.signedUrl }}
                          style={styles.photoThumbImage}
                        />
                      )}
                      <View style={styles.photoIndex}>
                        <AppText
                          variant="caption"
                          weight="bold"
                          color={Colors.white}
                        >
                          {index + 1}
                        </AppText>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
              {feedback && (
                <>
                  <View style={styles.feedbackStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        color={
                          star <= feedback.rating
                            ? Colors.warning
                            : Colors.border
                        }
                        fill={
                          star <= feedback.rating ? Colors.warning : 'transparent'
                        }
                      />
                    ))}
                    <AppText variant="body" weight="semiBold">
                      {feedback.rating}/5
                    </AppText>
                  </View>
                  {feedback.tags.length > 0 && (
                    <View style={styles.feedbackTags}>
                      {feedback.tags.map((tag) => (
                        <View key={tag} style={styles.feedbackTagChip}>
                          <AppText variant="caption" color={Colors.primary}>
                            {tag}
                          </AppText>
                        </View>
                      ))}
                    </View>
                  )}
                  {feedback.comment.trim() ? (
                    <AppText variant="bodySm" color={Colors.textSecondary}>
                      &ldquo;{feedback.comment.trim()}&rdquo;
                    </AppText>
                  ) : null}
                  <Pressable
                    style={styles.viewReviewBtn}
                    onPress={() => setShowReviewModal(true)}
                    hitSlop={8}
                  >
                    <AppText variant="bodySm" weight="semiBold" color={Colors.cta}>
                      View Full Review →
                    </AppText>
                  </Pressable>
                </>
              )}
            </View>
          </>
        )}
      </View>

      {!paymentConfirmed ? (
        <View style={{ width: '100%', gap: Spacing['2'] }}>
          <AppButton
            label="Confirm Payment — Cash"
            variant="primary"
            fullWidth
            onPress={() => onConfirmCash('CASH')}
          />
          <AppButton
            label="Confirm Payment — Online (Simulated)"
            variant="secondary"
            fullWidth
            onPress={() => onConfirmCash('ONLINE_SIMULATED')}
          />
        </View>
      ) : (
        <AppButton
          label="Payment & Commission Recorded"
          variant="primary"
          fullWidth
          disabled
          onPress={() => {}}
        />
      )}

      {/* ─── Review Detail Modal ─── */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText variant="h4" weight="bold">
                Your Review
              </AppText>
              <Pressable
                onPress={() => setShowReviewModal(false)}
                hitSlop={12}
              >
                <X color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
            >
              {proofPhotos.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.modalMediaRow}
                >
                  {proofPhotos.map((photo, index) => (
                    <View key={photo.id} style={styles.modalPhotoThumb}>
                      {photo.signedUrl && (
                        <Image
                          source={{ uri: photo.signedUrl }}
                          style={styles.modalPhotoImage}
                        />
                      )}
                      <View style={styles.modalPhotoIndex}>
                        <AppText
                          variant="caption"
                          weight="bold"
                          color={Colors.white}
                        >
                          {index + 1}
                        </AppText>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}

              {feedback && (
                <>
                  <View style={styles.modalRatingSection}>
                    <AppText variant="body" weight="semiBold">
                      Rating
                    </AppText>
                    <View style={styles.modalStarsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={24}
                          color={
                            star <= feedback.rating
                              ? Colors.warning
                              : Colors.border
                          }
                          fill={
                            star <= feedback.rating
                              ? Colors.warning
                              : 'transparent'
                          }
                        />
                      ))}
                      <AppText
                        variant="body"
                        weight="semiBold"
                        color={Colors.textSecondary}
                        style={styles.modalRatingText}
                      >
                        {feedback.rating}/5
                      </AppText>
                    </View>
                  </View>

                  {feedback.comment.trim() ? (
                    <View style={styles.modalReviewSection}>
                      <AppText variant="body" weight="semiBold">
                        Review
                      </AppText>
                      <AppText
                        variant="body"
                        color={Colors.textSecondary}
                        style={styles.reviewReadOnlyText}
                      >
                        &ldquo;{feedback.comment.trim()}&rdquo;
                      </AppText>
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['6'],
    alignItems: 'center',
    gap: Spacing['2'],
    ...Elevation.sm,
  },
  iconRow: {
    marginBottom: Spacing['1'],
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing['3'],
  },
  summaryCard: {
    width: '100%',
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.lg,
    padding: Spacing['4'],
    gap: Spacing['2'],
    marginBottom: Spacing['2'],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idValue: {
    flexShrink: 1,
    marginLeft: Spacing['2'],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  feedbackBlock: {
    gap: Spacing['2'],
  },
  feedbackStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
  },
  feedbackTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['1'],
  },
  feedbackTagChip: {
    backgroundColor: Colors.primarySurface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing['2'],
    paddingVertical: Spacing['1'],
  },
  mediaRow: {
    flexDirection: 'row',
    gap: Spacing['2'],
    paddingVertical: Spacing['1'],
  },
  photoThumb: {
    width: 120,
    height: 90,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoIndex: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  viewReviewBtn: {
    alignSelf: 'flex-start',
    marginTop: Spacing['1'],
  },

  // Review modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['5'],
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    maxHeight: '75%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing['3'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalBody: {},
  modalBodyContent: {
    paddingHorizontal: Spacing['4'],
    paddingVertical: Spacing['4'],
    gap: Spacing['3'],
  },
  modalMediaRow: {
    flexDirection: 'row',
    gap: Spacing['2'],
  },
  modalPhotoThumb: {
    width: 160,
    height: 120,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  modalPhotoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalPhotoIndex: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  modalRatingSection: {
    gap: Spacing['2'],
  },
  modalStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  modalRatingText: {
    marginLeft: Spacing['2'],
  },
  modalReviewSection: {
    gap: Spacing['2'],
  },
  reviewReadOnlyText: {
    fontStyle: 'italic',
    lineHeight: 22,
  },
});
