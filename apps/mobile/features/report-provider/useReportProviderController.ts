import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { fetchBookingDetail, reportBookingParticipant, attachBookingProof } from '@/services/api';
import { supabase } from '@/lib/supabase';
import { randomUUID } from '@/lib/crypto';
import { showAlert } from '@/components/AppAlert';

export const REPORT_REASONS = [
  'Unprofessional Conduct',
  'Unsafe Behavior',
  'Property Damage',
  'Late / No Show',
  'Price Overcharge',
  'Other',
];

export function useReportProviderController() {
  const router = useRouter();
  const { id, providerName } = useLocalSearchParams();
  const bookingId = Array.isArray(id) ? id[0] : id;
  const initialProviderName = Array.isArray(providerName)
    ? providerName[0]
    : providerName;

  const [booking, setBooking] = useState<any>(null);
  const [selectedReason, setSelectedReasonState] = useState<string | null>(null);
  const [details, setDetailsState] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const [reasonError, setReasonError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const submittingRef = useRef(false);

  useEffect(() => {
    if (bookingId) {
      void fetchBookingDetail(bookingId).then((result) => {
        if (!result.error) setBooking(result.data);
      });
    }
  }, [bookingId]);

  const setSelectedReason = (reason: string) => {
    setSelectedReasonState(reason);
    setReasonError(null);
  };

  const setDetails = (value: string) => {
    setDetailsState(value);
    if (value.trim().length >= 10) {
      setDetailsError(null);
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

    if (!selectedReason) {
      setReasonError('Please select a reason for reporting.');
      hasError = true;
    } else {
      setReasonError(null);
    }

    const trimmedDetails = details.trim();
    if (trimmedDetails.length < 10) {
      setDetailsError(
        'Please provide details describing the issue (at least 10 characters).',
      );
      hasError = true;
    } else {
      setDetailsError(null);
    }

    if (hasError) {
      showAlert(
        'Incomplete Report',
        'Please select a reason and describe the issue before submitting.',
      );
      return;
    }

    if (!bookingId) {
      showAlert(
        'Report Unavailable',
        'Missing booking reference for this report.',
      );
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const fullDetails = `[Reason: ${selectedReason}] ${trimmedDetails}`;
      await reportBookingParticipant(bookingId, fullDetails);

      if (photos.length > 0) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          for (const uri of photos) {
            try {
              const response = await fetch(uri);
              const bytes = await response.arrayBuffer();
              const contentType =
                response.headers.get('content-type') ?? 'image/jpeg';
              const path = `${user.id}/${randomUUID()}.jpg`;
              const { error } = await supabase.storage
                .from('review-media')
                .upload(path, bytes, { contentType });

              if (!error) {
                await attachBookingProof(bookingId, {
                  path,
                  contentType,
                  byteSize: bytes.byteLength,
                });
              }
            } catch (err) {
              // Ignore individual proof upload failure silently
            }
          }
        }
      }

      const generatedTicket = `#REP-${Math.floor(10000 + Math.random() * 90000)}`;
      setTicketId(generatedTicket);
      setSubmitted(true);
    } catch (error: any) {
      showAlert(
        'Submission Error',
        error?.message ||
          'Failed to submit report. Please try again or contact customer support.',
      );
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleDone = () => {
    router.replace('/(tabs)/home');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const targetWorkerName =
    booking?.worker_profiles?.display_name ??
    initialProviderName ??
    'Service Provider';
  const targetServiceName =
    booking?.service_requests?.service_categories?.name ?? 'Service';

  return {
    bookingId,
    targetWorkerName,
    targetServiceName,
    selectedReason,
    setSelectedReason,
    reasonError,
    details,
    setDetails,
    detailsError,
    photos,
    handleUpload,
    removePhoto,
    loading,
    submitted,
    ticketId,
    handleSubmit,
    handleDone,
    handleBack,
  };
}
