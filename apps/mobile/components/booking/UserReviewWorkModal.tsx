import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  X,
  Star,
  Check,
  ImagePlus,
  Trash2,
  ThumbsUp,
  MessageSquare,
  Camera,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { showAlert } from '@/components/AppAlert';
import {
  confirmJobCompletion,
  attachBookingProof,
  createReview,
} from '@/services/api';
import { uploadBookingProof } from '@/services/uploads';

interface UserReviewWorkModalProps {
  visible: boolean;
  bookingId: string;
  providerName?: string;
  serviceName?: string;
  onClose: () => void;
  onSubmitted: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor Experience',
  2: 'Fair Experience',
  3: 'Good Experience',
  4: 'Very Good Experience',
  5: 'Outstanding Service',
};

const QUICK_TAGS = [
  'Quality Work',
  'Punctual',
  'Friendly & Polite',
  'Professional',
  'Fair Price',
];

export const UserReviewWorkModal = React.memo(function UserReviewWorkModal({
  visible,
  bookingId,
  providerName = 'Provider',
  serviceName = 'Service',
  onClose,
  onSubmitted,
}: UserReviewWorkModalProps) {
  const [proofImages, setProofImages] = useState<string[]>([]);
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Quality Work',
    'Professional',
  ]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const uploadedRef = useRef<{ path: string; contentType: string; byteSize: number }[]>([]);

  useEffect(() => {
    if (visible) {
      setProofImages([]);
      setRating(5);
      setSelectedTags(['Quality Work', 'Professional']);
      setComment('');
      setSubmitting(false);
      uploadedRef.current = [];
    }
  }, [visible]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handlePickGallery = async () => {
    if (proofImages.length >= 3) return;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert(
          'Permission required',
          'Photo library access is required to select proof of work.',
        );
        return;
      }
      const picker = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 3 - proofImages.length,
        quality: 0.8,
      });
      if (picker.canceled) return;
      const uris = picker.assets.map((asset) => asset.uri);
      setProofImages((prev) => {
        const next = [...prev];
        for (const uri of uris) {
          if (next.length >= 3) break;
          if (!next.includes(uri)) next.push(uri);
        }
        return next;
      });
    } catch (error) {
      console.warn('Image pick failed:', error);
      showAlert('Selection failed', 'Could not open the photo library.');
    }
  };

  const handleTakePhoto = async () => {
    if (proofImages.length >= 3) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showAlert(
          'Permission required',
          'Camera access is required to capture proof of work photo.',
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      setProofImages((prev) => (prev.length < 3 ? [...prev, uri] : prev));
    } catch (error) {
      console.warn('Camera capture failed:', error);
      showAlert('Camera failed', 'Could not capture photo.');
    }
  };

  const handleRemoveImage = (uri: string) => {
    setProofImages((prev) => prev.filter((p) => p !== uri));
  };

  const handleSubmit = async () => {
    if (!bookingId) {
      showAlert('Error', 'Missing booking identifier.');
      return;
    }
    if (proofImages.length === 0) {
      showAlert(
        'Proof Required',
        'Please attach at least 1 photo of the completed work before proceeding to payment.',
      );
      return;
    }
    if (rating === 0) {
      showAlert('Rating Required', 'Please select a star rating for the provider.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload proof photos
      const uploaded = await Promise.all(
        proofImages.map((uri) => uploadBookingProof(uri)),
      );
      uploadedRef.current = uploaded;

      // 2. Submit review
      const mediaPayload = uploaded.map((m) => ({
        path: m.path,
        contentType: m.contentType,
        byteSize: m.byteSize,
      }));
      const fullComment = [
        comment.trim(),
        selectedTags.length > 0 ? `Highlights: ${selectedTags.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      await createReview(
        bookingId,
        rating,
        fullComment || 'Service completed successfully.',
        true,
        mediaPayload,
      );

      // 3. Confirm job completion if pending
      try {
        await confirmJobCompletion(bookingId);
      } catch (confirmError) {
        console.warn('confirmJobCompletion note:', confirmError);
      }

      onSubmitted();
    } catch (error: any) {
      console.error('Review submission failed:', error);
      showAlert(
        'Submission Failed',
        error?.message || 'Could not submit your review. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.overlayBackdrop}
          activeOpacity={1}
          onPress={() => {
            if (!submitting) onClose();
          }}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ width: 32 }} />
            <AppText variant="h3" weight="bold" color={theme.colors.textPrimary}>
              Review Provider & Work
            </AppText>
            <TouchableOpacity
              onPress={() => {
                if (!submitting) onClose();
              }}
              hitSlop={10}
              style={styles.closeBtn}
            >
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <AppText
              variant="bodySm"
              color={theme.colors.textSecondary}
              style={styles.subtitle}
            >
              Attach proof of work photo and rate {providerName} for {serviceName} before proceeding to payment.
            </AppText>

            {/* ── Proof of Work (Required) ── */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <ImagePlus size={18} color={theme.colors.primary} />
                <AppText
                  variant="h4"
                  color={theme.colors.textPrimary}
                  style={styles.sectionTitle}
                >
                  Proof of Work (At least 1 photo required) *
                </AppText>
              </View>

              {proofImages.length > 0 && (
                <View style={styles.thumbnailRow}>
                  {proofImages.map((uri) => (
                    <View key={uri} style={styles.thumbnailWrap}>
                      <Image
                        source={{ uri }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.removeThumb}
                        onPress={() => handleRemoveImage(uri)}
                        hitSlop={6}
                      >
                        <Trash2 size={14} color={theme.colors.surface} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <AppText
                variant="caption"
                color={theme.colors.textSecondary}
                style={styles.hint}
              >
                Snap a photo with camera or pick 1–3 photos from gallery as proof of completed service.
              </AppText>

              <View style={styles.photoActionsRow}>
                <TouchableOpacity
                  style={[styles.photoActionBtn, proofImages.length >= 3 && styles.disabledBtn]}
                  disabled={proofImages.length >= 3}
                  onPress={() => void handleTakePhoto()}
                >
                  <Camera size={18} color={theme.colors.primary} />
                  <AppText variant="bodySm" weight="semiBold" color={theme.colors.primary}>
                    Take Photo
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.photoActionBtn, proofImages.length >= 3 && styles.disabledBtn]}
                  disabled={proofImages.length >= 3}
                  onPress={() => void handlePickGallery()}
                >
                  <ImagePlus size={18} color={theme.colors.primary} />
                  <AppText variant="bodySm" weight="semiBold" color={theme.colors.primary}>
                    From Gallery ({proofImages.length}/3)
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Rate Experience ── */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Star size={18} color={theme.colors.primary} />
                <AppText
                  variant="h4"
                  color={theme.colors.textPrimary}
                  style={styles.sectionTitle}
                >
                  Rate Provider *
                </AppText>
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
                      size={34}
                      fill={
                        star <= rating ? theme.colors.warning : 'transparent'
                      }
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <AppText style={styles.ratingLabel}>
                {RATING_LABELS[rating] ?? ''}
              </AppText>
            </View>

            {/* ── Quick Compliments ── */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <ThumbsUp size={18} color={theme.colors.primary} />
                <AppText
                  variant="h4"
                  color={theme.colors.textPrimary}
                  style={styles.sectionTitle}
                >
                  Quick Compliments
                </AppText>
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
                      <AppText
                        variant="caption"
                        style={[
                          styles.tagChipText,
                          isSelected && styles.tagChipTextSelected,
                        ]}
                      >
                        {tag}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Feedback Notes ── */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <MessageSquare size={18} color={theme.colors.primary} />
                <AppText
                  variant="h4"
                  color={theme.colors.textPrimary}
                  style={styles.sectionTitle}
                >
                  Review & Feedback
                </AppText>
              </View>
              <TextInput
                placeholder="Share your experience working with this provider..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={3}
                value={comment}
                onChangeText={setComment}
                style={styles.textArea}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <AppButton
              label="Cancel"
              variant="ghost"
              size="md"
              style={styles.footerBtn}
              onPress={onClose}
            />
            <AppButton
              label="Submit Review & Proceed to Payment"
              variant="primary"
              size="md"
              loading={submitting}
              style={[styles.footerBtn, { flex: 2 }]}
              onPress={() => void handleSubmit()}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xxl,
    borderTopRightRadius: theme.radius.xxl,
    maxHeight: '92%',
    paddingBottom: theme.spacing.xl,
    ...theme.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.layout.screenPadding,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.borderLight,
  },
  scrollContent: {
    paddingHorizontal: theme.layout.screenPadding,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  subtitle: {
    marginBottom: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
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
  thumbnailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  thumbnailWrap: {
    position: 'relative',
  },
  thumbnail: {
    width: 92,
    height: 92,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.borderLight,
  },
  removeThumb: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginBottom: theme.spacing.md,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.infoBackground,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  starBtn: {
    padding: theme.spacing.xs,
  },
  ratingLabel: {
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
    color: theme.colors.textSecondary,
  },
  tagChipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 80,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
    paddingTop: theme.spacing.md,
  },
  footerBtn: {
    flex: 1,
  },
});
