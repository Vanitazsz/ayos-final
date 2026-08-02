import {
  acceptJob,
  cancelBooking,
  fetchWorkerBookings,
  subscribeToBookingFeed,
  type WorkerBooking,
} from '../logic/WorkerBookingsScreenLogic';
import { useState, useMemo, useEffect } from 'react';
import { AppState, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useWorkerBookingStore } from '@/store/useWorkerBookingStore';
import { useWorkerPresence } from '@/context/WorkerPresenceContext';
const TAB_FILTERS: Record<string, WorkerBooking['status'][]> = {
  Upcoming: ['pending', 'hired', 'accepted', 'worker_preparing'],
  'In Progress': [
    'worker_en_route',
    'worker_arrived',
    'service_started',
    'in_progress',
    'pending_confirmation',
  ],
  Completed: ['completed'],
  Cancelled: ['cancelled'],
};
export function useWorkerBookingsScreenController() {
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [activeTab, setActiveTab] = useState(
    filter === 'Cancelled' ? 'Cancelled' : 'Upcoming',
  );
  const [bookings, setBookings] = useState<WorkerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const { state: presenceState, message: presenceMessage } =
    useWorkerPresence();
  const isCurrentlyWorking = useWorkerBookingStore((s) => s.isCurrentlyWorking);
  const load = async () => {
    setLoading(true);
    const result = await fetchWorkerBookings();
    setBookings(result.data);
    setLoadError(result.error ?? '');
    setLoading(false);
  };
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
  }, []);
  const accept = async (id: string) => {
    try {
      await acceptJob(id);
      load();
    } catch (error) {
      Alert.alert(
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
      Alert.alert(
        'Unable to decline',
        error instanceof Error ? error.message : 'Please retry.',
      );
    }
  };
  const filteredBookings = useMemo(() => {
    const statuses = TAB_FILTERS[activeTab] || [];
    return bookings.filter((b) => statuses.includes(b.status));
  }, [activeTab, bookings]);
  return {
    activeTab,
    setActiveTab,
    loading,
    loadError,
    presenceState,
    presenceMessage,
    isCurrentlyWorking,
    load,
    accept,
    decline,
    filteredBookings,
    router,
  };
}
