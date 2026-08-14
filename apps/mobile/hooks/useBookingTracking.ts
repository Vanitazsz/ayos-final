import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmCustomerArrival,
  confirmCustomerCompletion,
  fetchBookingTracking,
  fetchBookingProofPhotos,
  subscribeToTable,
  type BookingProofPhoto,
} from '@/services/api';
import {
  subscribeToEnRouteLocation,
  type LiveEnRouteLocation,
} from '@/services/liveDispatch';
import { showAlert } from '@/components/AppAlert';
import { shouldLoadBookingProofPhotos } from '@/utils/bookingTracking';
import { queryKeys, QUERY_STALE_TIMES } from '@/services/queryUtils';

export function useBookingTracking(bookingId: string | undefined) {
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmingArrival, setIsConfirmingArrival] = useState(false);
  const [trackingActionError, setTrackingActionError] = useState<string | null>(
    null,
  );
  const [liveLocation, setLiveLocation] = useState<LiveEnRouteLocation | null>(
    null,
  );

  const trackingQuery = useQuery({
    queryKey: queryKeys.bookingTracking(bookingId ?? ''),
    queryFn: () => fetchBookingTracking(bookingId as string),
    staleTime: QUERY_STALE_TIMES.live,
    enabled: Boolean(bookingId),
  });
  const tracking = trackingQuery.data ?? null;
  const workerStatus = tracking?.booking?.status as string | undefined;
  const trackingIsLoading = trackingQuery.isLoading;

  useEffect(() => {
    if (!bookingId) return;
    const stopBroadcast = subscribeToEnRouteLocation(bookingId, (loc) => {
      setLiveLocation(loc);
    });
    return () => {
      stopBroadcast();
    };
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    const invalidate = () =>
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bookingTracking(bookingId),
      });
    const stopBooking = subscribeToTable(
      'bookings',
      invalidate,
      `id=eq.${bookingId}`,
      undefined,
      ['INSERT', 'UPDATE'],
    );
    const stopStatusEvents = subscribeToTable(
      'booking_status_events',
      invalidate,
      `booking_id=eq.${bookingId}`,
      undefined,
      ['INSERT', 'UPDATE'],
    );
    return () => {
      stopBooking();
      stopStatusEvents();
    };
  }, [bookingId, queryClient]);

  useEffect(() => {
    setTrackingActionError(null);
  }, [bookingId, workerStatus]);

  const loadProofPhotos =
    Boolean(bookingId) && shouldLoadBookingProofPhotos(workerStatus);
  const proofPhotosQuery = useQuery({
    queryKey: queryKeys.bookingProofPhotos(bookingId ?? ''),
    queryFn: () => fetchBookingProofPhotos(bookingId as string),
    staleTime: QUERY_STALE_TIMES.list,
    enabled: loadProofPhotos,
  });
  const proofPhotos = loadProofPhotos ? (proofPhotosQuery.data ?? []) : [];
  const isLoadingProofPhotos = loadProofPhotos
    ? proofPhotosQuery.isLoading
    : false;
  const proofPhotosError = proofPhotosQuery.error
    ? proofPhotosQuery.error instanceof Error
      ? proofPhotosQuery.error.message
      : 'Proof photos unavailable'
    : null;

  const confirmArrival = useCallback(async () => {
    if (!bookingId || isConfirmingArrival) return;
    setIsConfirmingArrival(true);
    setTrackingActionError(null);
    try {
      await confirmCustomerArrival(bookingId);
      queryClient.setQueryData(
        queryKeys.bookingTracking(bookingId),
        await fetchBookingTracking(bookingId),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Please try again.';
      setTrackingActionError(message);
      showAlert('Arrival confirmation failed', message);
    } finally {
      setIsConfirmingArrival(false);
    }
  }, [bookingId, isConfirmingArrival, queryClient]);

  const confirmCompletion = useCallback(async () => {
    if (!bookingId || isConfirming) return;
    setIsConfirming(true);
    setTrackingActionError(null);
    try {
      await confirmCustomerCompletion(bookingId);
      queryClient.setQueryData(
        queryKeys.bookingTracking(bookingId),
        await fetchBookingTracking(bookingId),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Please try again.';
      setTrackingActionError(message);
      showAlert('Completion confirmation failed', message);
    } finally {
      setIsConfirming(false);
    }
  }, [bookingId, isConfirming, queryClient]);

  return {
    tracking,
    trackingIsLoading,
    isConfirming,
    isConfirmingArrival,
    trackingActionError,
    liveLocation,
    workerStatus,
    proofPhotos,
    isLoadingProofPhotos,
    proofPhotosError,
    confirmArrival,
    confirmCompletion,
  };
}
