import {
  fetchWorkerReviews,
  type ReviewData,
} from '../logic/WorkerReviewsScreenLogic';
import { useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useWorkerReviewsScreenController() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const loadReviews = useCallback(() => {
    void fetchWorkerReviews().then((result) => setReviews(result.data));
  }, []);
  useFocusEffect(loadReviews);
  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return reviews;
    const q = searchQuery.toLowerCase();
    return reviews.filter(
      (r) =>
        r.author.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q) ||
        r.serviceType.toLowerCase().includes(q),
    );
  }, [searchQuery, reviews]);
  return { insets, searchQuery, setSearchQuery, reviews, filteredReviews };
}
