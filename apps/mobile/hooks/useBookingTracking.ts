import { useCallback, useEffect, useState } from 'react';
import {
  confirmJobCompletion,
  fetchBookingTracking,
  subscribeToTable,
} from '@/services/api';
import {
  subscribeToEnRouteLocation,
  type LiveEnRouteLocation,
} from '@/services/liveDispatch';
import { showAlert } from '@/components/AppAlert';

export function useBookingTracking(bookingId: string | undefined) {
  const [tracking, setTracking] = useState<any>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [liveLocation, setLiveLocation] = useState<LiveEnRouteLocation | null>(
    null,
  );

  useEffect(() => {
    if (!bookingId) return;
    const stopBroadcast = subscribeToEnRouteLocation(bookingId, (loc) => {
      setLiveLocation(loc);
    });
    return () => {
      stopBroadcast();
    };
  }, [bookingId]);

  const workerStatus = tracking?.booking?.status as string | undefined;
  useEffect(() => {
    if (!bookingId) return;
    const load = () =>
      void fetchBookingTracking(bookingId)
        .then(setTracking)
        .catch(() => setTracking(null));
    load();
    const stopLocation = subscribeToTable(
      'location_updates',
      load,
      `booking_id=eq.${bookingId}`,
      undefined,
      ['INSERT', 'UPDATE'],
    );
    const stopBooking = subscribeToTable(
      'bookings',
      load,
      `id=eq.${bookingId}`,
      undefined,
      ['INSERT', 'UPDATE'],
    );
    const stopStatusEvents = subscribeToTable(
      'booking_status_events',
      load,
      `booking_id=eq.${bookingId}`,
      undefined,
      ['INSERT', 'UPDATE'],
    );
    const poll = setInterval(() => {
      if (
        !tracking?.booking?.status ||
        !['COMPLETED', 'CANCELLED'].includes(tracking.booking.status)
      )
        load();
    }, 20000);
    return () => {
      stopLocation();
      stopBooking();
      stopStatusEvents();
      clearInterval(poll);
    };
  }, [bookingId, tracking?.booking?.status]);

  const confirmCompletion = useCallback(async () => {
    if (!bookingId || isConfirming) return;
    setIsConfirming(true);
    try {
      await confirmJobCompletion(bookingId);
      setTracking(await fetchBookingTracking(bookingId));
    } catch (error) {
      showAlert(
        'Confirmation failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsConfirming(false);
    }
  }, [bookingId, isConfirming]);

  return {
    tracking,
    isConfirming,
    liveLocation,
    workerStatus,
    confirmCompletion,
  };
}
