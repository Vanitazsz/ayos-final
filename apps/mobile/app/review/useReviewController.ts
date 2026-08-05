import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { randomUUID } from '@/lib/crypto';
import { createReview, fetchBookingDetail } from '@/services/api';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/components/AppAlert';

export function useReviewController() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const bookingId = Array.isArray(id) ? id[0] : id;

  const [rating, setRatingState] = useState(0);
  const [review, setReviewState] = useState('');
  const [recommend, setRecommend] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  const [ratingError, setRatingError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const submittingRef = useRef(false);

  useEffect(() => {
    if (bookingId) {
      void fetchBookingDetail(bookingId).then((result) => {
        if (!result.error) setBooking(result.data);
      });
    }
  }, [bookingId]);

  const setRating = (value: number) => {
    setRatingState(value);
    if (value > 0) {
      setRatingError(null);
    }
  };

  const setReview = (value: string) => {
    setReviewState(value);
    if (value.trim().length >= 3) {
      setReviewError(null);
    }
  };

  const handleUpload = async () => {
    if (photos.length >= 3) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Permission required', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;

    let hasError = false;

    if (rating === 0) {
      setRatingError('Star rating is required. Please select at least 1 star.');
      hasError = true;
    } else {
      setRatingError(null);
    }

    const commentText = review.trim();
    if (commentText.length < 3) {
      setReviewError('Review comment is required (minimum 3 characters).');
      hasError = true;
    } else {
      setReviewError(null);
    }

    if (hasError) {
      showAlert(
        'Required Fields Missing',
        'Please complete all required fields marked with * before submitting.',
      );
      return;
    }

    if (!bookingId) {
      showAlert(
        'Review unavailable',
        'This review is missing its booking reference. Please return to your completed bookings and try again.',
      );
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Your session has expired. Please sign in again and retry.');
      }

      const media = [];
      if (photos.length > 0) {
        for (const uri of photos) {
          const response = await fetch(uri);
          const bytes = await response.arrayBuffer();
          const contentType =
            response.headers.get('content-type') ?? 'image/jpeg';
          const path = `${user.id}/${randomUUID()}.jpg`;
          const { error } = await supabase.storage
            .from('review-media')
            .upload(path, bytes, { contentType });
          if (error) throw error;
          media.push({ path, contentType, byteSize: bytes.byteLength });
        }
      }

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
      submittingRef.current = false;
      setLoading(false);
      router.replace('/(tabs)/home');
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)/home');
  };

  return {
    booking,
    rating,
    setRating,
    review,
    setReview,
    recommend,
    setRecommend,
    photos,
    handleUpload,
    removePhoto,
    loading,
    ratingError,
    reviewError,
    handleSubmit,
    handleSkip,
  };
}
