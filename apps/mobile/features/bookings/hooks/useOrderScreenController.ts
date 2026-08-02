import { fetchBookingDetail } from '../logic/OrderScreenLogic';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useRequestStore } from '@/store/useRequestStore';

export function useOrderScreenController() {
  const router = useRouter();
  const draft = useRequestStore();
  const [booking, setBooking] = useState<any>(null);
  useEffect(() => {
    if (draft.bookingId)
      void fetchBookingDetail(draft.bookingId).then((result) => {
        if (!result.error) setBooking(result.data);
      });
  }, [draft.bookingId]);
  const request = booking?.service_requests ?? {};
  const provider = {
    avatarUri: booking?.worker_profiles?.avatar_path ?? '',
    name: booking?.worker_profiles?.display_name ?? '',
    category: request.service_categories?.name ?? '',
  };
  const handleBack = () => {
    // Return to the bookings tab
    router.replace('/(tabs)/bookings');
  };
  const handleTrack = () => {
    // Go to Live Tracking
    if (draft.bookingId) router.push(`/tracking/${draft.bookingId}`);
  };
  return { booking, request, provider, handleBack, handleTrack };
}
