import { fetchBookingDetail } from '../logic/PaymentScreenLogic';
import { useState, useCallback, useEffect } from 'react';
import { router } from 'expo-router';
import { useRequestStore } from '@/store/useRequestStore';

export function usePaymentScreenController() {
  const draft = useRequestStore();
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [booking, setBooking] = useState<any>(null);
  const selectedWorker = {
    avatarUri: booking?.worker_profiles?.avatar_path ?? '',
    name: booking?.worker_profiles?.display_name ?? '',
    category: booking?.service_requests?.service_categories?.name ?? '',
    price:
      booking?.agreed_service_amount == null
        ? 'Price pending'
        : `₱${Number(booking.agreed_service_amount).toLocaleString()}`,
  };
  useEffect(() => {
    if (draft.bookingId)
      void fetchBookingDetail(draft.bookingId).then((result) => {
        if (!result.error) setBooking(result.data);
      });
  }, [draft.bookingId]);
  const handleBack = useCallback(() => router.back(), []);
  const handlePay = useCallback(() => {
    if (!draft.bookingId) return;
    router.dismissAll();
    router.replace(`/tracking/${draft.bookingId}`);
  }, [draft.bookingId]);
  return {
    selectedMethod,
    setSelectedMethod,
    selectedWorker,
    handleBack,
    handlePay,
  };
}
