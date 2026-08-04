import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const data = await AsyncStorage.getItem(`${STORAGE_PREFIX}${bookingId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}
