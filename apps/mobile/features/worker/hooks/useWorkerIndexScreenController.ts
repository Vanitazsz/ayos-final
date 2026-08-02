import {
  fetchWalletTransactions,
  fetchWorkerBookings,
  fetchWorkerProfile,
  subscribeToTable,
  type WorkerBooking,
  type WorkerProfile,
  getMyDispatchOffers,
  getMyWorkerLiveStatus,
  refreshWorkerPresence,
  respondToDispatch,
  subscribeToDispatch,
  type DispatchOffer,
  type WorkerLiveStatus,
} from '../logic/WorkerIndexScreenLogic';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useWorkerBookingStore } from '@/store/useWorkerBookingStore';
import { useWorkerPresence } from '@/context/WorkerPresenceContext';

export function useWorkerIndexScreenController() {
  const insets = useSafeAreaInsets();
  const isCurrentlyWorking = useWorkerBookingStore((s) => s.isCurrentlyWorking);
  const currentBookingId = useWorkerBookingStore((s) => s.currentBookingId);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(
    null,
  );
  const [workerBookings, setWorkerBookings] = useState<WorkerBooking[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [dispatchOffers, setDispatchOffers] = useState<DispatchOffer[]>([]);
  const { state: presenceState, message: presenceMessage } =
    useWorkerPresence();
  const [liveStatus, setLiveStatus] = useState<WorkerLiveStatus | null>(null);
  const [refreshingLocation, setRefreshingLocation] = useState(false);
  useEffect(() => {
    const load = () =>
      void Promise.all([
        fetchWorkerProfile(),
        fetchWorkerBookings(),
        fetchWalletTransactions(),
      ])
        .then(([profile, bookings, transactions]) => {
          if (!profile.error) setWorkerProfile(profile.data);
          setWorkerBookings(bookings.data);
          setEarnings(
            transactions.data
              .filter((row) => row.credit)
              .reduce(
                (sum, row) => sum + Number(row.amount.replace(/[^0-9.]/g, '')),
                0,
              ),
          );
        })
        .catch((e) => console.warn('[worker-dashboard] load failed:', e));
    load();
    const stops = ['bookings', 'service_requests', 'wallet_transactions'].map(
      (table) => subscribeToTable(table, load),
    );
    return () => stops.forEach((stop) => stop());
  }, []);
  useEffect(() => {
    let active = true;
    const loadOffers = () =>
      void getMyDispatchOffers()
        .then((rows) => {
          if (active) setDispatchOffers(rows);
        })
        .catch(() => {});
    const loadLiveStatus = () =>
      void getMyWorkerLiveStatus()
        .then((status) => {
          if (active) setLiveStatus(status);
        })
        .catch(() => {});
    loadOffers();
    loadLiveStatus();
    const stopDispatch = subscribeToDispatch(loadOffers);
    return () => {
      active = false;
      stopDispatch();
    };
  }, []);
  const refreshLocation = async () => {
    setRefreshingLocation(true);
    try {
      const status = await refreshWorkerPresence();
      setLiveStatus(status);
    } catch (error) {
      console.warn(error);
    } finally {
      setRefreshingLocation(false);
    }
  };
  const respond = async (
    offer: DispatchOffer,
    response: 'ACCEPTED' | 'DECLINED',
  ) => {
    await respondToDispatch(offer.dispatchId, response);
    setDispatchOffers((current) =>
      current.map((item) =>
        item.dispatchId === offer.dispatchId
          ? { ...item, status: response }
          : item,
      ),
    );
  };
  const activeBookings = workerBookings.filter(
    (row) => !['completed', 'cancelled'].includes(row.status),
  );
  const completed = workerBookings.filter(
    (row) => row.status === 'completed',
  ).length;
  const todayStats = [
    {
      label: 'Active',
      value: workerBookings
        .filter((row) =>
          [
            'worker_en_route',
            'worker_arrived',
            'service_started',
            'in_progress',
          ].includes(row.status),
        )
        .length.toString(),
    },
    {
      label: 'Pending',
      value: workerBookings
        .filter((row) =>
          ['pending', 'accepted', 'worker_preparing'].includes(row.status),
        )
        .length.toString(),
    },
    { label: 'Completed', value: completed.toString() },
    { label: 'Earnings', value: `₱${earnings.toLocaleString()}` },
  ];
  const completionRate = workerBookings.length
    ? Math.round((completed / workerBookings.length) * 100)
    : 0;
  return {
    insets,
    isCurrentlyWorking,
    currentBookingId,
    workerProfile,
    dispatchOffers,
    presenceState,
    presenceMessage,
    liveStatus,
    refreshingLocation,
    refreshLocation,
    respond,
    activeBookings,
    todayStats,
    completionRate,
    router,
    Image,
  };
}
