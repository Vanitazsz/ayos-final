import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ViewStyle,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload, X } from 'lucide-react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppText } from './AppText';

interface ImageUploadCardProps {
  label: string;
  description?: string;
  onImageSelected: (uri: string | null) => void;
  error?: string;
  containerStyle?: ViewStyle;
}

export const ImageUploadCard: React.FC<ImageUploadCardProps> = ({
  label,
  description = 'Supports JPG, PNG, HEIC up to 10MB',
  onImageSelected,
  error,
  containerStyle,
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);

  const handleUploadGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'Photo library access is required to select this image.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      Alert.alert('File too large', 'Select an image up to 10 MB.');
      return;
    }
    setImageUri(asset.uri);
    onImageSelected(asset.uri);
  };

  const handleCapture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'Camera access is required to capture this image.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      Alert.alert('File too large', 'Capture an image up to 10 MB.');
      return;
    }
    setImageUri(asset.uri);
    onImageSelected(asset.uri);
  };

  const handleRemove = () => {
    setImageUri(null);
    onImageSelected(null);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <AppText variant="label" weight="medium" style={styles.label}>
        {label}
      </AppText>

      {imageUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          <Pressable style={styles.removeButton} onPress={handleRemove}>
            <X size={20} color={Colors.white} />
          </Pressable>
        </View>
      ) : (
        <View
          style={[
            styles.uploadArea,
            { borderColor: error ? Colors.error : Colors.border },
          ]}
        >
          <View style={styles.iconRow}>
            <Pressable
              style={styles.actionButton}
              onPress={handleUploadGallery}
            >
              <View style={styles.iconCircle}>
                <Upload size={24} color={Colors.primary} />
              </View>
              <AppText
                variant="bodySm"
                weight="semiBold"
                style={styles.actionText}
              >
                Upload from Gallery
              </AppText>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.actionButton} onPress={handleCapture}>
              <View style={styles.iconCircle}>
                <Camera size={24} color={Colors.primary} />
              </View>
              <AppText
                variant="bodySm"
                weight="semiBold"
                style={styles.actionText}
              >
                Take Photo
              </AppText>
            </Pressable>
          </View>

          <AppText
            variant="caption"
            color={Colors.textTertiary}
            style={styles.description}
          >
            {description}
          </AppText>
        </View>
      )}

      {error && (
        <AppText
          variant="caption"
          color={Colors.error}
          style={styles.errorText}
        >
          {error}
        </AppText>
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
});
