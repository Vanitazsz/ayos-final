import { useCallback, useEffect, useRef, useState } from 'react';
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

export function useBookingTracking(bookingId: string | undefined) {
  const [tracking, setTracking] = useState<any>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmingArrival, setIsConfirmingArrival] = useState(false);
  const [trackingActionError, setTrackingActionError] = useState<string | null>(null);
  const [liveLocation, setLiveLocation] = useState<LiveEnRouteLocation | null>(
    null,
  );
  const [proofPhotos, setProofPhotos] = useState<BookingProofPhoto[]>([]);
  const [isLoadingProofPhotos, setIsLoadingProofPhotos] = useState(false);
  const [proofPhotosError, setProofPhotosError] = useState<string | null>(null);
  const statusRef = useRef<string | undefined>(undefined);

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
    let active = true;
    const load = () => {
      void fetchBookingTracking(bookingId)
        .then((next) => {
          if (!active) return;
          statusRef.current = next?.booking?.status;
          setTracking(next);
        })
        .catch(() => {
          if (active) setTracking(null);
        });
    };
    const channelStatuses = new Map<string, string>([
      ['bookings', 'CONNECTING'],
      ['booking_status_events', 'CONNECTING'],
    ]);
    let fallback: ReturnType<typeof setInterval> | null = null;
    const syncFallback = () => {
      const connected = [...channelStatuses.values()].every(
        (status) => status === 'SUBSCRIBED',
      );
      if (connected && fallback) {
        clearInterval(fallback);
        fallback = null;
      } else if (!connected && !fallback) {
        fallback = setInterval(() => {
          if (
            !statusRef.current ||
            !['COMPLETED', 'CANCELLED'].includes(statusRef.current)
          )
            load();
        }, 20000);
      }
    };
    const track = (table: string) => (status: string) => {
      channelStatuses.set(table, status);
      if (status === 'SUBSCRIBED') load();
      syncFallback();
    };
    load();
    const stopBooking = subscribeToTable(
      'bookings',
      load,
      `id=eq.${bookingId}`,
      track('bookings'),
      ['INSERT', 'UPDATE'],
    );
    const stopStatusEvents = subscribeToTable(
      'booking_status_events',
      load,
      `booking_id=eq.${bookingId}`,
      track('booking_status_events'),
      ['INSERT', 'UPDATE'],
    );
    syncFallback();
    return () => {
      active = false;
      stopBooking();
      stopStatusEvents();
      if (fallback) clearInterval(fallback);
    };
  }, [bookingId]);

  const workerStatus = tracking?.booking?.status as string | undefined;

  useEffect(() => {
    setTrackingActionError(null);
  }, [bookingId, workerStatus]);

  useEffect(() => {
    if (!bookingId || !shouldLoadBookingProofPhotos(workerStatus)) {
      setProofPhotos([]);
      setProofPhotosError(null);
      setIsLoadingProofPhotos(false);
      return;
    }
    let active = true;
    setIsLoadingProofPhotos(true);
    setProofPhotosError(null);
    void fetchBookingProofPhotos(bookingId)
      .then((photos) => {
        if (active) setProofPhotos(photos);
      })
      .catch((error) => {
        if (active) {
          setProofPhotos([]);
          setProofPhotosError(
            error instanceof Error ? error.message : 'Proof photos unavailable',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingProofPhotos(false);
      });
    return () => {
      active = false;
    };
  }, [bookingId, workerStatus]);

  const confirmArrival = useCallback(async () => {
    if (!bookingId || isConfirmingArrival) return;
    setIsConfirmingArrival(true);
    setTrackingActionError(null);
    try {
      await confirmCustomerArrival(bookingId);
      setTracking(await fetchBookingTracking(bookingId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      setTrackingActionError(message);
      showAlert('Arrival confirmation failed', message);
    } finally {
      setIsConfirmingArrival(false);
    }
  }, [bookingId, isConfirmingArrival]);

  const confirmCompletion = useCallback(async () => {
    if (!bookingId || isConfirming) return;
    setIsConfirming(true);
    setTrackingActionError(null);
    try {
      await confirmCustomerCompletion(bookingId);
      setTracking(await fetchBookingTracking(bookingId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      setTrackingActionError(message);
      showAlert('Completion confirmation failed', message);
    } finally {
      setIsConfirming(false);
    }
  }, [bookingId, isConfirming]);

  return {
    tracking,
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
