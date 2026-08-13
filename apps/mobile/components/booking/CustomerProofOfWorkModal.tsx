import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { X, ImagePlus, Trash2 } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { showAlert } from '@/components/AppAlert';
import { attachBookingProof } from '@/services/api';
import { uploadBookingProof } from '@/services/uploads';
import { supabase } from '@/lib/supabase';

interface CustomerProofOfWorkModalProps {
  visible: boolean;
  bookingId: string;
  providerName?: string;
  serviceName?: string;
  onClose: () => void;
  onSubmitted: () => void;
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

export const CustomerProofOfWorkModal = React.memo(
  function CustomerProofOfWorkModal({
    visible,
    bookingId,
    providerName = 'Provider',
    serviceName = 'Service',
    onClose,
    onSubmitted,
  }: CustomerProofOfWorkModalProps) {
    const [proofImages, setProofImages] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const uploadedRef = useRef<
      { path: string; contentType: string; byteSize: number }[]
    >([]);

    useEffect(() => {
      if (visible) {
        setProofImages([]);
        setSubmitting(false);
        uploadedRef.current = [];
      }
    }, [visible]);

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
            'Camera access is required to capture a proof of work photo.',
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

    const cleanupUploadedProofs = async () => {
      const uploaded = uploadedRef.current;
      uploadedRef.current = [];
      await Promise.all(uploaded.map((media) => removeProofStorage(media.path)));
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

      setSubmitting(true);
      try {
        const uploaded = await Promise.all(
          proofImages.map((uri) => uploadBookingProof(uri)),
        );
        uploadedRef.current = uploaded;
        await Promise.all(
          uploaded.map((media) =>
            attachBookingProof(bookingId, media, { submittedBy: 'customer' }),
          ),
        );
        onSubmitted();
      } catch (error) {
        console.error('Proof submission failed:', error);
        await cleanupUploadedProofs();
        showAlert(
          'Submission Failed',
          errorMessage(
            error,
            'Could not submit your proof. Please try again.',
          ),
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
              <AppText
                variant="h3"
                weight="bold"
                color={theme.colors.textPrimary}
              >
                Proof of Work
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
                Attach photos of the completed work
                {serviceName ? ` for ${serviceName}` : ''}
                {providerName ? ` with ${providerName}` : ''} to proceed to
                payment.
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
                  Add 1–3 photos of the completed work (images only). At least
                  one photo is required before payment.
                </AppText>

                <View style={styles.actions}>
                  <AppButton
                    label={
                      proofImages.length === 0
                        ? 'Add Photos'
                        : `Add Photos (${proofImages.length}/3)`
                    }
                    variant={proofImages.length >= 3 ? 'ghost' : 'outline'}
                    disabled={proofImages.length >= 3}
                    size="md"
                    style={styles.actionBtn}
                    onPress={() => void handlePickImages()}
                  />
                  <AppButton
                    label="Take Photo"
                    variant="outline"
                    disabled={proofImages.length >= 3}
                    size="md"
                    style={styles.actionBtn}
                    onPress={() => void handleTakePhoto()}
                  />
                </View>
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
                label="Submit Proof"
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
  },
);

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
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionBtn: {
    flex: 1,
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
