import { randomUUID } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';
import type { MediaInput } from '@/types/ai';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const supportedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/webm',
]);

function normalizeContentType(
  value: string | null | undefined,
  fallback?: string,
) {
  const candidate = value?.split(';')[0]?.trim().toLowerCase();
  if (candidate && supportedTypes.has(candidate))
    return candidate === 'audio/x-m4a' || candidate === 'audio/m4a'
      ? 'audio/mp4'
      : candidate;
  if (fallback && supportedTypes.has(fallback))
    return fallback === 'audio/x-m4a' || fallback === 'audio/m4a'
      ? 'audio/mp4'
      : fallback;
  throw new Error('This photo or audio format is not supported.');
}

function extensionFor(contentType: string) {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'audio/mpeg') return 'mp3';
  if (contentType === 'audio/mp4' || contentType === 'audio/m4a') return 'm4a';
  return contentType.split('/')[1] ?? 'bin';
}

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

export async function uploadRequestMedia(
  uri: string,
  fallbackContentType?: string,
  durationSeconds?: number,
): Promise<MediaInput> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user)
    throw userError ?? new Error('Authentication required');

  const response = await fetch(uri);
  if (!response.ok) throw new Error('The selected media could not be read.');
  const blob = await response.blob();
  const contentType = normalizeContentType(blob.type, fallbackContentType);
  if (blob.size > 15 * 1024 * 1024)
    throw new Error('Media must be 15 MB or smaller.');

  const path = `${user.id}/${randomUUID()}.${extensionFor(contentType)}`;
  const bytes = await blobToArrayBuffer(blob);
  const { error } = await supabase.storage
    .from('request-media')
    .upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;

  return {
    bucket: 'request-media',
    path,
    contentType,
    byteSize: bytes.byteLength,
    durationSeconds,
  };
}

export async function deleteRequestMedia(media: MediaInput) {
  const { error } = await supabase.storage
    .from(media.bucket)
    .remove([media.path]);
  if (error) throw error;
}

export async function uploadBookingProof(uri: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user)
    throw userError ?? new Error('Authentication required');

  const sourceUri = await compressProofImage(uri);
  const response = await fetch(sourceUri);
  if (!response.ok)
    throw new Error('The selected proof photo could not be read.');
  const blob = await response.blob();
  const contentType = normalizeContentType(blob.type, 'image/jpeg');
  if (!contentType.startsWith('image/'))
    throw new Error('Proof of work must be an image.');
  if (blob.size > 15 * 1024 * 1024)
    throw new Error('Proof photos must be 15 MB or smaller.');

  const path = `${user.id}/${randomUUID()}.${extensionFor(contentType)}`;
  const bytes = await blobToArrayBuffer(blob);
  const { error } = await supabase.storage
    .from('booking-proof')
    .upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
  return { path, contentType, byteSize: bytes.byteLength };
}

export async function uploadWalletTopupProof(uri: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user)
    throw userError ?? new Error('Authentication required');

  const sourceUri = await compressProofImage(uri);
  const response = await fetch(sourceUri);
  if (!response.ok)
    throw new Error('The selected top-up proof photo could not be read.');
  const blob = await response.blob();
  const contentType = normalizeContentType(blob.type, 'image/jpeg');
  if (!contentType.startsWith('image/'))
    throw new Error('Top-up proof must be an image.');
  if (blob.size > 10 * 1024 * 1024)
    throw new Error('Top-up proof photos must be 10 MB or smaller.');

  const path = `${user.id}/${randomUUID()}.${extensionFor(contentType)}`;
  const bytes = await blobToArrayBuffer(blob);
  const { error } = await supabase.storage
    .from('topup-proofs')
    .upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
  return { path, contentType, byteSize: bytes.byteLength };
}

export async function deleteWalletTopupProof(path: string) {
  const { error } = await supabase.storage.from('topup-proofs').remove([path]);
  if (error) throw error;
}

async function compressProofImage(uri: string): Promise<string> {
  try {
    const imageRef = await ImageManipulator.manipulate(uri)
      .resize({ width: 1600 })
      .renderAsync();
    const result = await imageRef.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.7,
    });
    return result.uri;
  } catch {
    return uri;
  }
}
