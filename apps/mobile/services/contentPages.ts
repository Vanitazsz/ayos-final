import { supabase } from '@/lib/supabase';

export type ContentPageKey = 'HELP_CENTER' | 'PRIVACY';

export interface ContentPageViewModel {
  title: string;
  body: string;
  version: string;
  updatedAt: string;
}

export async function fetchPublishedContentPage(
  key: ContentPageKey,
): Promise<ContentPageViewModel | null> {
  const { data, error } = await supabase
    .from('content_pages')
    .select('title,body,version,updated_at')
    .eq('key', key)
    .not('published_at', 'is', null)
    .maybeSingle();

  if (error?.code === 'PGRST116') return null;
  if (error) throw error;
  if (!data) return null;

  const title = data.title.trim();
  const body = data.body.trim();
  const version = data.version.trim();
  if (
    !title ||
    !body ||
    !version ||
    version === 'local-1' ||
    body.toLowerCase().includes('replace before production')
  ) {
    return null;
  }

  return {
    title,
    body,
    version,
    updatedAt: data.updated_at,
  };
}
