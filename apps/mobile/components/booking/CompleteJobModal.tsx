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
import { X, Star, Check, ImagePlus, Trash2, ThumbsUp, MessageSquare } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { QUICK_TAGS, RATING_LABELS } from '@/constants/workerFeedback';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { showAlert } from '@/components/AppAlert';
import { completeJob, attachBookingProof, deleteBookingProof } from '@/services/api';
import { submitWorkerFeedback } from '@/services/workerFeedback';
import { uploadBookingProof } from '@/services/uploads';
import { supabase } from '@/lib/supabase';

interface CompleteJobModalProps {
  visible: boolean;
  bookingId: string;
  customerName?: string;
  serviceName?: string;
  onClose: () => void;
  onCompleted: () => void;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

async function removeProofStorage(storagePath: string) {
  const { error } = await supabase.storage
    .from('booking-proof')
    .remove([storagePath]);
  if (error) console.warn('booking-proof storage removal failed:', error);
}

export const CompleteJobModal = React.memo(function CompleteJobModal({
  visible,
  bookingId,
  customerName,
  serviceName,
  onClose,
  onCompleted,
}: CompleteJobModalProps) {
  const [proofImages, setProofImages] = useState<string[]>([]);
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Prompt Payment',
    'Easy Communication',
  ]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const uploadedRef = useRef<{ path: string; contentType: string; byteSize: number }[]>([]);

  useEffect(() => {
    if (visible) {
      setProofImages([]);
      setRating(5);
      setSelectedTags(['Prompt Payment', 'Easy Communication']);
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

  const handlePickImages = async () => {
    if (proofImages.length >= 3) return;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert(
          'Permission required',
          'Photo-library access is required to attach proof of work.',
        );
        return;
      }
      const picker = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 3 - proofImages.length,
        quality: 0.85,
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

  const handleRemoveImage = (uri: string) => {
    setProofImages((prev) => prev.filter((p) => p !== uri));
  };

  const cleanupUploadedProofs = async () => {
    const uploaded = uploadedRef.current;
    uploadedRef.current = [];
    await Promise.all(
      uploaded.map(async (media) => {
        await removeProofStorage(media.path);
        try {
          await deleteBookingProof(bookingId, media.path);
        } catch {
          // record may not exist yet; storage removal above already ran
        }
      }),
    );
  };

  const handleSubmit = async () => {
    if (!bookingId) {
      showAlert('Error', 'Missing booking identifier.');
      return;
    }
    if (proofImages.length === 0) {
      showAlert('Proof Required', 'Add at least one photo of the completed work.');
      return;
    }

    setSubmitting(true);
    try {
      const uploaded = await Promise.all(
        proofImages.map((uri) => uploadBookingProof(uri)),
      );
      uploadedRef.current = uploaded;
      await Promise.all(
        uploaded.map((media) => attachBookingProof(bookingId, media)),
      );
      await submitWorkerFeedback(
        bookingId,
        rating,
        comment.trim(),
        selectedTags,
      );
      await completeJob(bookingId);
      onCompleted();
    } catch (error) {
      console.error('Complete job failed:', error);
      await cleanupUploadedProofs();
      showAlert(
        'Complete failed',
        errorMessage(error, 'Could not complete the job. Please try again.'),
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
              Complete Job
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
              Add proof of work and feedback to finish this booking
              {serviceName ? ` for ${serviceName}` : ''}
              {customerName ? ` with ${customerName}` : ''}.
            </AppText>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <ImagePlus size={18} color={theme.colors.primary} />
                <AppText
                  variant="h4"
                  color={theme.colors.textPrimary}
                  style={styles.sectionTitle}
                >
                  Proof of Work
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
                Add 1–3 photos of the completed work (images only).
              </AppText>

              <AppButton
                label={
                  proofImages.length === 0
                    ? 'Add Photos'
                    : `Add Photos (${proofImages.length}/3)`
                }
                variant={proofImages.length >= 3 ? 'ghost' : 'outline'}
                disabled={proofImages.length >= 3}
                size="md"
                fullWidth
                onPress={() => void handlePickImages()}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Star size={18} color={theme.colors.primary} />
                <AppText
                  variant="h4"
                  color={theme.colors.textPrimary}
                  style={styles.sectionTitle}
                >
                  Rate Customer Experience
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

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <MessageSquare size={18} color={theme.colors.primary} />
                <AppText
                  variant="h4"
                  color={theme.colors.textPrimary}
                  style={styles.sectionTitle}
                >
                  Feedback / Notes
                </AppText>
              </View>
              <TextInput
                placeholder="Optional: add a note about your experience..."
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
              label="Complete Job"
              variant="primary"
              size="md"
              loading={submitting}
              style={styles.footerBtn}
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
    minHeight: 90,
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
