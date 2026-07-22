import { randomUUID } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';
import type { MediaInput } from '@/types/ai';

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

function normalizeContentType(value: string | null | undefined, fallback?: string) {
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

export async function uploadRequestMedia(
  uri: string,
  fallbackContentType?: string,
  durationSeconds?: number,
): Promise<MediaInput> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw userError ?? new Error('Authentication required');

  const response = await fetch(uri);
  if (!response.ok) throw new Error('The selected media could not be read.');
  const blob = await response.blob();
  const contentType = normalizeContentType(blob.type, fallbackContentType);
  if (blob.size > 15 * 1024 * 1024) throw new Error('Media must be 15 MB or smaller.');

  const path = `${user.id}/${randomUUID()}.${extensionFor(contentType)}`;
  const bytes = await blob.arrayBuffer();
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
  const { error } = await supabase.storage.from(media.bucket).remove([media.path]);
  if (error) throw error;
}
