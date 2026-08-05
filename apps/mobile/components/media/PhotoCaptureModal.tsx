import React, { useEffect, useRef, useState } from 'react';
import {ActivityIndicator,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type CameraCapturedPicture,
} from 'expo-camera';
import { Image } from 'expo-image';
import { Camera, X } from 'lucide-react-native';

import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import { showAlert } from '@/components/AppAlert';

type Props = {
  visible: boolean;
  onClose: () => void;
  onUsePhoto: (photo: CameraCapturedPicture) => void;
};

export function PhotoCaptureModal({
  visible,
  onClose,
  onUsePhoto,
}: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [preview, setPreview] = useState<CameraCapturedPicture | null>(null);
  const [busy, setBusy] = useState(false);
  const secureWebContext =
    Platform.OS !== 'web' ||
    typeof window === 'undefined' ||
    window.isSecureContext;

  useEffect(() => {
    if (!visible) {
      setPreview(null);
      setBusy(false);
      return;
    }
    if (secureWebContext && permission?.status === 'undetermined')
      void requestPermission();
  }, [permission?.status, requestPermission, secureWebContext, visible]);

  const capture = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      if (photo) setPreview(photo);
    } catch (error) {
      showAlert(
        'Photo unavailable',
        error instanceof Error
          ? error.message
          : 'The camera could not take a photo. Try again or upload one.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close camera"
            style={styles.iconButton}
            onPress={onClose}
          >
            <X color={theme.colors.surface} size={26} />
          </TouchableOpacity>
          <Text style={styles.title}>Take Photo</Text>
          <View style={styles.iconButton} />
        </View>

        {!secureWebContext ? (
          <View style={styles.message}>
            <Camera color={theme.colors.surface} size={48} />
            <Text style={styles.messageTitle}>Secure connection required</Text>
            <Text style={styles.messageCopy}>
              Open A-YOS over HTTPS or localhost to use the browser camera.
              Upload Photo remains available.
            </Text>
            <Button title="Close" onPress={onClose} />
          </View>
        ) : !permission ? (
          <View style={styles.message}>
            <ActivityIndicator size="large" color={theme.colors.surface} />
            <Text style={styles.messageCopy}>Checking camera access…</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.message}>
            <Camera color={theme.colors.surface} size={48} />
            <Text style={styles.messageTitle}>Camera permission required</Text>
            <Text style={styles.messageCopy}>
              Allow camera access to take a photo of the problem.
            </Text>
            {permission.canAskAgain ? (
              <Button title="Allow Camera" onPress={() => requestPermission()} />
            ) : (
              <Button
                title="Open Settings"
                onPress={() => void Linking.openSettings()}
              />
            )}
          </View>
        ) : preview ? (
          <View style={styles.previewContainer}>
            <Image
              source={preview.uri}
              style={styles.preview}
              contentFit="contain"
            />
            <View style={styles.previewActions}>
              <Button
                title="Retake"
                variant="outlined"
                onPress={() => setPreview(null)}
                style={styles.previewButton}
              />
              <Button
                title="Use Photo"
                onPress={() => onUsePhoto(preview)}
                style={styles.previewButton}
              />
            </View>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              mode="picture"
            />
            <View style={styles.captureBar}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Capture photo"
                disabled={busy}
                style={styles.captureButton}
                onPress={() => void capture()}
              >
                {busy ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : (
                  <View style={styles.captureButtonInner} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080B12',
  },
  header: {
    minHeight: 72,
    paddingTop: Platform.OS === 'ios' ? 18 : 0,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.h4,
    color: theme.colors.surface,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  captureBar: {
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.surface,
  },
  previewContainer: {
    flex: 1,
  },
  preview: {
    flex: 1,
    width: '100%',
  },
  previewActions: {
    padding: theme.spacing.lg,
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  previewButton: {
    flex: 1,
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  messageTitle: {
    ...theme.typography.h3,
    color: theme.colors.surface,
    textAlign: 'center',
  },
  messageCopy: {
    ...theme.typography.body2,
    color: '#D4D8E3',
    textAlign: 'center',
    maxWidth: 440,
  },
});
