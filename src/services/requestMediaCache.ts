import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const CACHE_PREFIX = '@req_media_';
const CACHE_TTL_MS = 55 * 60 * 1000; // 55 min – 5-min safety margin before 1-hour signature expiry

export async function getRequestMediaSignedUrl(storagePath: string): Promise<string | null> {
  if (!storagePath) return null;

  const cacheKey = `${CACHE_PREFIX}${storagePath}`;
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (raw) {
      const cached: { url: string; expiresAt: number } = JSON.parse(raw) as { url: string; expiresAt: number };
      if (cached.expiresAt > Date.now()) return cached.url;
    }
  } catch {
    // corrupted or missing – proceed to fetch
  }

  const { data, error } = await supabase.storage
    .from('request-media')
    .createSignedUrls([storagePath], 3600);
  if (error || !data?.length) return null;

  const signed = data[0];
  if (!signed?.signedUrl || signed.error) return null;

  const entry = { url: signed.signedUrl, expiresAt: Date.now() + CACHE_TTL_MS };
  AsyncStorage.setItem(cacheKey, JSON.stringify(entry)).catch(() => {});

  return signed.signedUrl;
}
