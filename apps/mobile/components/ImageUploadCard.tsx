import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Platform,
  Modal,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload, X, FileText, CheckCircle2, RefreshCw } from 'lucide-react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppText } from './AppText';
import { showAlert } from '@/components/AppAlert';

interface ImageUploadCardProps {
  label: string;
  description?: string;
  onImageSelected: (uri: string | null) => void;
  error?: string;
  containerStyle?: ViewStyle;
  labelStyle?: StyleProp<TextStyle>;
  existingUri?: string | null;
  existingLabel?: string;
}

export const ImageUploadCard: React.FC<ImageUploadCardProps> = ({
  label,
  description = 'Supports PDF, JPG, PNG up to 10MB',
  onImageSelected,
  error,
  containerStyle,
  labelStyle,
  existingUri,
  existingLabel = 'Current ID',
}) => {
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState<boolean>(false);

  // Web Live Camera Modal state
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up webcam stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Upload PDF or Photo File
  const handleUploadGallery = async () => {
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,.pdf,application/pdf';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) return;
          if (file.size > 10 * 1024 * 1024) {
            showAlert('File too large', 'Select a file up to 10 MB.');
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const uri = typeof reader.result === 'string' ? reader.result : URL.createObjectURL(file);
            const pdfCheck = file.type === 'application/pdf' || file.name.endsWith('.pdf');
            setIsPdf(pdfCheck);
            setFileName(file.name);
            setFileUri(uri);
            onImageSelected(uri);
          };
          reader.readAsDataURL(file);
        };
        input.click();
      } catch (err) {
        console.warn('Web file picker fallback failed:', err);
      }
      return;
    }

    // Native iOS/Android permission check & picker
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert(
        'Permission required',
        'Photo library access is required to select your ID image or document.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      showAlert('File too large', 'Select an image or document up to 10 MB.');
      return;
    }
    setIsPdf(false);
    setFileName(asset.fileName || 'ID_Document.jpg');
    setFileUri(asset.uri);
    onImageSelected(asset.uri);
  };

  // Camera Photo Capture Functionality (Native & Web)
  const handleCapture = async () => {
    // 1. Web browser live webcam capture
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          });
          streamRef.current = stream;
          setShowWebcamModal(true);
          // Wait for modal to render video element
          setTimeout(() => {
            if (videoRef.current && streamRef.current) {
              videoRef.current.srcObject = streamRef.current;
              void videoRef.current.play();
            }
          }, 200);
          return;
        } catch (webcamErr) {
          console.warn('Live Web Camera stream not available, falling back to file capture:', webcamErr);
        }
      }

      // Fallback file input capture for web
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.setAttribute('capture', 'environment');
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const uri = typeof reader.result === 'string' ? reader.result : URL.createObjectURL(file);
            setIsPdf(false);
            setFileName('Camera_ID_Capture.jpg');
            setFileUri(uri);
            onImageSelected(uri);
          };
          reader.readAsDataURL(file);
        };
        input.click();
      } catch (err) {
        console.warn('Web camera file input failed:', err);
      }
      return;
    }

    // 2. Native iOS/Android Camera Access
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showAlert(
        'Camera permission required',
        'Please grant camera access in settings to take a photo of your ID.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      showAlert('File too large', 'Captured photo exceeds 10 MB.');
      return;
    }
    setIsPdf(false);
    setFileName('Camera_ID_Photo.jpg');
    setFileUri(asset.uri);
    onImageSelected(asset.uri);
  };

  // Snap photo from web video feed
  const snapWebcamPhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        closeWebcamModal();
        setIsPdf(false);
        setFileName('Webcam_ID_Photo.jpg');
        setFileUri(dataUrl);
        onImageSelected(dataUrl);
      }
    } catch (err) {
      console.error('Failed to snap webcam photo:', err);
    }
  };

  const closeWebcamModal = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowWebcamModal(false);
  };

  const handleRemove = () => {
    setFileUri(null);
    setFileName(null);
    setIsPdf(false);
    onImageSelected(null);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <AppText variant="label" weight="medium" style={[styles.label, labelStyle]}>
        {label}
      </AppText>

      {fileUri ? (
        isPdf ? (
          /* PDF Document Preview Card */
          <View style={styles.pdfPreviewContainer}>
            <View style={styles.pdfIconCircle}>
              <FileText size={28} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodySm" weight="bold" numberOfLines={1}>
                {fileName || 'Attached_ID_Document.pdf'}
              </AppText>
              <View style={styles.verifiedBadgeRow}>
                <CheckCircle2 size={14} color={Colors.verified} />
                <AppText variant="caption" color={Colors.verified} weight="semiBold">
                  PDF Document Ready
                </AppText>
              </View>
            </View>
            <Pressable style={styles.removeButtonInline} onPress={handleRemove} hitSlop={8}>
              <X size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>
        ) : (
          /* Image Preview Card */
          <View style={styles.previewContainer}>
            <Image source={{ uri: fileUri }} style={styles.imagePreview} />
            <Pressable style={styles.removeButton} onPress={handleRemove} hitSlop={8}>
              <X size={20} color={Colors.white} />
            </Pressable>
          </View>
        )
      ) : (
        <>
          {existingUri ? (
            <View style={styles.existingPreviewWrap}>
              <Image
                source={{ uri: existingUri }}
                style={styles.existingPreview}
                resizeMode="cover"
              />
              <View style={styles.existingBadge}>
                <CheckCircle2 size={12} color={Colors.verified} />
                <AppText variant="caption" color={Colors.verified} weight="semiBold">
                  {existingLabel}
                </AppText>
              </View>
            </View>
          ) : null}

          {/* Options Card: Upload PDF / Photo OR Take Photo */}
          <View
            style={[
              styles.uploadArea,
              { borderColor: error ? Colors.error : Colors.border },
            ]}
          >
            <View style={styles.iconRow}>
              <Pressable style={styles.actionButton} onPress={handleUploadGallery}>
                <View style={styles.iconCircle}>
                  <Upload size={24} color={Colors.primary} />
                </View>
                <AppText variant="bodySm" weight="semiBold" style={styles.actionText}>
                  Upload PDF / File
                </AppText>
              </Pressable>
              <View style={styles.divider} />
              <Pressable style={styles.actionButton} onPress={handleCapture}>
                <View style={styles.iconCircle}>
                  <Camera size={24} color={Colors.primary} />
                </View>
                <AppText variant="bodySm" weight="semiBold" style={styles.actionText}>
                  Take Photo
                </AppText>
              </Pressable>
            </View>

            <AppText variant="caption" color={Colors.textTertiary} style={styles.description}>
              {description}
            </AppText>
          </View>
        </>
      )}

      {error && (
        <AppText variant="caption" color={Colors.error} weight="bold" style={styles.errorText}>
          ⚠️ {error}
        </AppText>
      )}

      {/* Web Live Camera Modal */}
      {showWebcamModal && Platform.OS === 'web' && (
        <Modal
          transparent
          animationType="fade"
          visible={showWebcamModal}
          onRequestClose={closeWebcamModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.webcamModalContent}>
              <View style={styles.modalHeader}>
                <AppText variant="body" weight="bold">
                  Camera Viewfinder — Take Photo of ID
                </AppText>
                <Pressable onPress={closeWebcamModal} style={{ padding: 4 }}>
                  <X size={22} color={Colors.textPrimary} />
                </Pressable>
              </View>

              {/* HTML5 Live Video Element */}
              <View style={styles.webcamContainer}>
                <video
                  ref={(ref) => {
                    videoRef.current = ref;
                    if (ref && streamRef.current) {
                      ref.srcObject = streamRef.current;
                      void ref.play();
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '240px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    transform: 'scaleX(-1)', // Mirror effect for webcam
                  }}
                />
                <View style={styles.viewfinderFrame}>
                  <AppText variant="caption" color="#ffffff" weight="bold" style={{ textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 4 }}>
                    Align ID card inside this box
                  </AppText>
                </View>
              </View>

              <View style={styles.webcamActionRow}>
                <Pressable style={styles.cancelWebcamBtn} onPress={closeWebcamModal}>
                  <AppText variant="bodySm" color={Colors.textSecondary} weight="medium">
                    Cancel
                  </AppText>
                </Pressable>
                <Pressable style={styles.snapWebcamBtn} onPress={snapWebcamPhoto}>
                  <Camera size={20} color={Colors.white} />
                  <AppText variant="bodySm" color={Colors.white} weight="bold">
                    Snap Photo
                  </AppText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  label: {
    marginBottom: Spacing['2'],
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: Spacing['4'],
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: Spacing['3'],
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['2'],
  },
  actionText: {
    color: Colors.textPrimary,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing['2'],
  },
  description: {
    textAlign: 'center',
  },
  existingPreviewWrap: {
    position: 'relative',
    marginBottom: Spacing['3'],
  },
  existingPreview: {
    width: '100%',
    height: 160,
    borderRadius: Radius.lg,
  },
  existingBadge: {
    position: 'absolute',
    left: Spacing['2'],
    bottom: Spacing['2'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing['2'],
  },
  previewContainer: {
    width: '100%',
    height: 200,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pdfPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing['3'],
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primaryBorder,
    gap: Spacing['3'],
  },
  pdfIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
    marginTop: 2,
  },
  removeButtonInline: {
    padding: Spacing['2'],
    borderRadius: Radius.full,
    backgroundColor: Colors.borderLight,
  },
  removeButton: {
    position: 'absolute',
    top: Spacing['2'],
    right: Spacing['2'],
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: Spacing['2'],
    borderRadius: Radius.full,
  },
  errorText: {
    marginTop: Spacing['1'],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['4'],
  },
  webcamModalContent: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['4'],
    width: '100%',
    maxWidth: 480,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['3'],
    paddingBottom: Spacing['2'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  webcamContainer: {
    position: 'relative',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderFrame: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    right: '10%',
    bottom: '15%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.white,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webcamActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing['3'],
    marginTop: Spacing['4'],
  },
  cancelWebcamBtn: {
    paddingVertical: Spacing['2'],
    paddingHorizontal: Spacing['4'],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  snapWebcamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: Colors.primary,
    paddingVertical: Spacing['2'],
    paddingHorizontal: Spacing['5'],
    borderRadius: Radius.md,
  },
});
