import * as ImagePicker from 'expo-image-picker';

export interface SelectedImage {
  uri: string;
  mimeType?: string | null;
}

interface SelectImageOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  requirePermission?: boolean;
}

export async function selectImage(
  options: SelectImageOptions = {},
): Promise<SelectedImage | null> {
  if (options.requirePermission) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      throw new Error('Photo-library access is required.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: options.allowsEditing,
    aspect: options.aspect,
    quality: options.quality,
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}

export async function recoverPendingImage(): Promise<SelectedImage | null> {
  const pending = await ImagePicker.getPendingResultAsync();
  if (!pending || 'code' in pending || pending.canceled || !pending.assets[0])
    return null;
  return pending.assets[0];
}
