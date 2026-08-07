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
    const { error } = await supabase.rpc('submit_worker_feedback', {
      p_booking_id: bookingId,
      p_rating: rating,
      p_comment: comment,
      p_tags: tags,
    });
    if (error) throw error;
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
  try {
    const { data, error } = await supabase
      .from('worker_feedback')
      .select('rating,comment,tags,created_at')
      .eq('booking_id', bookingId)
      .maybeSingle();
    if (!error && data) {
      return {
        bookingId,
        rating: data.rating,
        comment: data.comment ?? '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        submittedAt: data.created_at ?? new Date().toISOString(),
      };
    }
    if (error) {
      console.warn('Server feedback lookup failed, falling back to local:', error);
    }
  } catch (err) {
    console.warn('Server feedback lookup threw, falling back to local:', err);
  }

  try {
    const local = await AsyncStorage.getItem(`${STORAGE_PREFIX}${bookingId}`);
    return local ? JSON.parse(local) : null;
  } catch {
    return null;
  }
}
