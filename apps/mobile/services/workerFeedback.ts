import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export interface WorkerFeedback {
  bookingId: string;
  rating: number;
  comment: string;
  tags: string[];
  submittedAt: string;
}

const STORAGE_PREFIX = '@worker_feedback_';

export async function submitWorkerFeedback(
  bookingId: string,
  rating: number,
  comment: string,
  tags: string[] = [],
): Promise<WorkerFeedback> {
  const feedback: WorkerFeedback = {
    bookingId,
    rating,
    comment,
    tags,
    submittedAt: new Date().toISOString(),
  };

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { error } = await supabase.rpc('submit_worker_feedback', {
        p_booking_id: bookingId,
        p_rating: rating,
        p_comment: comment,
        p_tags: tags,
      });
      if (error) throw error;
    }
  } catch (err) {
    console.warn('Server feedback submission failed, keeping local copy:', err);
  }

  await AsyncStorage.setItem(
    `${STORAGE_PREFIX}${bookingId}`,
    JSON.stringify(feedback),
  );
  return feedback;
}

export async function getWorkerFeedback(
  bookingId: string,
): Promise<WorkerFeedback | null> {
  const batch = await getWorkerFeedbackBatch([bookingId]);
  return batch[bookingId] ?? null;
}

export async function getWorkerFeedbackBatch(
  bookingIds: string[],
): Promise<Record<string, WorkerFeedback>> {
  const result: Record<string, WorkerFeedback> = {};
  if (bookingIds.length === 0) return result;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase
        .from('worker_feedback')
        .select('booking_id,rating,comment,tags,created_at')
        .in('booking_id', bookingIds);
      if (!error && data) {
        for (const row of data) {
          result[row.booking_id] = {
            bookingId: row.booking_id,
            rating: row.rating,
            comment: row.comment ?? '',
            tags: Array.isArray(row.tags) ? row.tags : [],
            submittedAt: row.created_at ?? new Date().toISOString(),
          };
        }
      } else if (error) {
        console.warn('Server feedback batch lookup failed:', error);
      }
    }
  } catch (err) {
    console.warn('Server feedback batch lookup threw:', err);
  }

  const missing = bookingIds.filter((id) => !result[id]);
  const localKeys = missing.map((id) => `${STORAGE_PREFIX}${id}`);
  const localEntries = await AsyncStorage.multiGet(localKeys);
  for (const [key, value] of localEntries) {
    if (value) {
      const id = key.slice(STORAGE_PREFIX.length);
      try {
        result[id] = JSON.parse(value) as WorkerFeedback;
      } catch {
        // ignore corrupted local copy
      }
    }
  }
  return result;
}
