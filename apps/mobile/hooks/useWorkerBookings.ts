import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';
import {
  acceptJob,
  cancelBooking,
  fetchWorkerBookings,
  getWorkerFeedbackBatch,
  subscribeToBookingFeed,
  type WorkerBooking,
  type WorkerFeedback,
} from '@/services/api';
import { useWorkerBookingStore } from '@/store/useWorkerBookingStore';
import { showAlert } from '@/components/AppAlert';
import {
  queryKeys,
  QUERY_STALE_TIMES,
  toQueryData,
} from '@/services/queryUtils';
import { useAuthStore } from '@/store/useAuthStore';

const TAB_FILTERS: Record<string, WorkerBooking['status'][]> = {
  Upcoming: ['pending', 'hired', 'accepted', 'worker_preparing'],
  'In Progress': [
    'en_route',
    'worker_en_route',
    'arrived',
    'worker_arrived',
    'service_started',
    'in_progress',
    'pending_confirmation',
  ],
  Pending: ['pending_review'],
  Completed: ['completed'],
  Cancelled: ['cancelled'],
};

export function useWorkerBookings(initialFilter?: string) {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(
    initialFilter === 'Cancelled'
      ? 'Cancelled'
      : initialFilter === 'Reported'
        ? 'Reported'
        : 'Upcoming',
  );
  const [feedbackMap, setFeedbackMap] = useState<
    Record<string, WorkerFeedback>
  >({});
  const isCurrentlyWorking = useWorkerBookingStore((s) => s.isCurrentlyWorking);

  const bookingsQuery = useQuery({
    queryKey: queryKeys.workerBookings(userId ?? 'anonymous'),
    queryFn: async () => toQueryData(await fetchWorkerBookings()),
    staleTime: QUERY_STALE_TIMES.list,
    enabled: Boolean(userId),
  });
  const bookings = bookingsQuery.data ?? [];
  const loading = bookingsQuery.isLoading;
  const loadError = bookingsQuery.error
    ? bookingsQuery.error instanceof Error
      ? bookingsQuery.error.message
      : 'Unable to load bookings'
    : '';

  const load = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.workerBookings(userId ?? 'anonymous'),
    });
  }, [queryClient, userId]);

  const completedKey = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'completed')
        .map((b) => b.id)
        .sort()
        .join(','),
    [bookings],
  );

  useEffect(() => {
    if (!completedKey) {
      setFeedbackMap({});
      return;
    }
    let active = true;
    void getWorkerFeedbackBatch(completedKey.split(','))
      .then((map) => {
        if (active) setFeedbackMap(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [completedKey]);

  useEffect(() => {
    let active = true;
    let stopRealtime = () => {};
    void subscribeToBookingFeed('worker', () => void load()).then((stop) => {
      if (active) stopRealtime = stop;
      else stop();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });
    return () => {
      active = false;
      stopRealtime();
      appState.remove();
    };
  }, [load]);

  const accept = async (id: string) => {
    try {
      await acceptJob(id);
      load();
    } catch (error) {
      showAlert(
        'Unable to accept',
        error instanceof Error ? error.message : 'Please retry.',
      );
    }
  };

  const decline = async (id: string) => {
    try {
      await cancelBooking(id, 'Worker declined the assigned booking');
      load();
    } catch (error) {
      showAlert(
        'Unable to decline',
        error instanceof Error ? error.message : 'Please retry.',
      );
    }
  };

  const filteredBookings = useMemo(() => {
    if (activeTab === 'Reported') {
      return bookings.filter((b) => b.isReported === true);
    }
    const statuses = TAB_FILTERS[activeTab] || [];
    return bookings.filter((b) => statuses.includes(b.status));
  }, [activeTab, bookings]);

  return {
    activeTab,
    setActiveTab,
    bookings,
    feedbackMap,
    loading,
    loadError,
    isCurrentlyWorking,
    load,
    accept,
    decline,
    filteredBookings,
  };
}
