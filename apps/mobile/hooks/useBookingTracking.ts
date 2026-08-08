import { useCallback, useEffect, useRef, useState } from 'react';
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
