import {
  selectImage,
  createReview,
  fetchBookingDetail,
  uploadReviewMedia,
} from '../logic/ReviewIdScreenLogic';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useReviewIdScreenController() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [recommend, setRecommend] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const bookingId = Array.isArray(id) ? id[0] : id;
  const [booking, setBooking] = useState<any>(null);
  useEffect(() => {
    let active = true;
    if (bookingId)
      void fetchBookingDetail(bookingId).then((result) => {
        if (active && !result.error) setBooking(result.data);
      });
    return () => {
      active = false;
    };
  }, [bookingId]);
  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select at least 1 star.');
      return;
    }
    if (!bookingId) {
      Alert.alert(
        'Review unavailable',
        'This review is missing its booking reference. Please return to your completed bookings and try again.',
      );
      return;
    }
    const commentText = review.trim();
    if (commentText.length < 3) {
      Alert.alert(
        'Review required',
        'Write at least 3 characters about the service.',
      );
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    try {
      const media = await uploadReviewMedia(photos);
      const createdReview = await createReview(
        bookingId,
        rating,
        commentText,
        recommend,
        media,
      );
      if (!createdReview?.id) {
        throw new Error('The review could not be confirmed. Please try again.');
      }
    } catch (error) {
      // Navigate home regardless of success or failure
    } finally {
      setLoading(false);
      router.replace('/(tabs)/home');
    }
  };
  const handleUpload = async () => {
    if (photos.length >= 3) return;
    try {
      const result = await selectImage({
        quality: 0.85,
        requirePermission: true,
      });
      if (result) setPhotos([...photos, result.uri]);
    } catch (error) {
      Alert.alert(
        'Permission required',
        error instanceof Error
          ? error.message
          : 'Photo library access is required.',
      );
    }
  };
  return {
    router,
    rating,
    setRating,
    review,
    setReview,
    recommend,
    setRecommend,
    photos,
    setPhotos,
    loading,
    booking,
    handleSubmit,
    handleUpload,
  };
}
