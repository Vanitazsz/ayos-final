import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import {
  acceptJob,
  cancelBooking,
  fetchWorkerBookings,
  getWorkerFeedback,
  subscribeToBookingFeed,
  type WorkerBooking,
  type WorkerFeedback,
} from '@/services/api';
import { useWorkerBookingStore } from '@/store/useWorkerBookingStore';
import { showAlert } from '@/components/AppAlert';

const TAB_FILTERS: Record<string, WorkerBooking['status'][]> = {
  Upcoming: ['pending', 'hired', 'accepted', 'worker_preparing'],
  'In Progress': ['en_route', 'worker_en_route', 'arrived', 'worker_arrived', 'service_started', 'in_progress', 'pending_confirmation'],
  Pending: ['pending_review'],
  Completed: ['completed'],
  Cancelled: ['cancelled'],
};

export function useWorkerBookings(initialFilter?: string) {
  const [activeTab, setActiveTab] = useState(
    initialFilter === 'Cancelled' ? 'Cancelled' : initialFilter === 'Reported' ? 'Reported' : 'Upcoming',
  );
  const [bookings, setBookings] = useState<WorkerBooking[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, WorkerFeedback>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const isCurrentlyWorking = useWorkerBookingStore((s) => s.isCurrentlyWorking);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchWorkerBookings();
    setBookings(result.data);
    setLoadError(result.error ?? '');

    const completedItems = (result.data ?? []).filter(
      (b) => b.status === 'completed',
    );
    const feedbackPairs = await Promise.all(
      completedItems.map(async (b) => {
        const fb = await getWorkerFeedback(b.id);
        return [b.id, fb] as const;
      }),
    );
    const map: Record<string, WorkerFeedback> = {};
    for (const [id, fb] of feedbackPairs) {
      if (fb) map[id] = fb;
    }
    setFeedbackMap(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    let stopRealtime = () => {};
    void load();
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
