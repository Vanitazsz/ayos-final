import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchWalletTransactions,
  fetchWorkerBookings,
  fetchWorkerProfile,
  subscribeToTable,
  type WorkerBooking,
  type WorkerProfile,
} from '@/services/api';
import {
  getMyDispatchOffers,
  getMyWorkerLiveStatus,
  refreshWorkerPresence,
  respondToDispatch,
  subscribeToDispatch,
  type DispatchOffer,
  type WorkerLiveStatus,
} from '@/services/liveDispatch';
import { useWorkerPresence } from '@/context/WorkerPresenceContext';

export function useWorkerDashboard() {
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [workerBookings, setWorkerBookings] = useState<WorkerBooking[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [dispatchOffers, setDispatchOffers] = useState<DispatchOffer[]>([]);
  const { state: presenceState, message: presenceMessage } = useWorkerPresence();
  const ready = presenceState !== 'starting';
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
          const completedBookingSum = (bookings.data ?? [])
            .filter((row) => row.status === 'completed')
            .reduce(
              (sum, row) =>
                sum + Number(row.price.replace(/[^0-9.]/g, '') || 0),
              0,
            );
          const walletTxSum = (transactions.data ?? [])
            .filter((row) => row.credit && row.status === 'completed')
            .reduce(
              (sum, row) =>
                sum + Number(row.amount.replace(/[^0-9.]/g, '') || 0),
              0,
            );
          const profileEarnings = profile.data?.earnings
            ? Number(profile.data.earnings.replace(/[^0-9.]/g, '') || 0)
            : 0;
          const validWalletTxSum = walletTxSum < 1000000000 ? walletTxSum : 0;
          setEarnings(
            profileEarnings || completedBookingSum || validWalletTxSum,
          );
        })
        .catch((e) => console.warn('[worker-dashboard] load failed:', e));
    load();
    const stops = ['bookings', 'service_requests', 'wallet_transactions'].map(
      (table) => subscribeToTable(table, load, undefined, undefined, ['INSERT', 'UPDATE']),
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

  const refreshLocation = useCallback(async () => {
    setRefreshingLocation(true);
    try {
      const status = await refreshWorkerPresence();
      setLiveStatus(status);
    } catch (error) {
      console.warn(error);
    } finally {
      setRefreshingLocation(false);
    }
  }, []);

  const respond = useCallback(
    async (offer: DispatchOffer, response: 'ACCEPTED' | 'DECLINED') => {
      await respondToDispatch(offer.dispatchId, response);
      setDispatchOffers((current) =>
        current.map((item) =>
          item.dispatchId === offer.dispatchId
            ? { ...item, status: response }
            : item,
        ),
      );
    },
    [],
  );

  const activeBookings = useMemo(
    () =>
      workerBookings.filter(
        (row) => !['completed', 'cancelled'].includes(row.status),
      ),
    [workerBookings],
  );
  const completed = useMemo(
    () => workerBookings.filter((row) => row.status === 'completed').length,
    [workerBookings],
  );
  const todayStats = useMemo(
    () => [
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
    ],
    [workerBookings, completed, earnings],
  );
  const completionRate = workerBookings.length
    ? Math.round((completed / workerBookings.length) * 100)
    : 0;
  const incomingJob = useMemo(
    () =>
      dispatchOffers.find(
        (o) => o.status === 'OFFERED' || o.status === 'VIEWED',
      ),
    [dispatchOffers],
  );

  const isOnline = presenceState === 'online';

  return {
    workerProfile,
    workerBookings,
    earnings,
    dispatchOffers,
    liveStatus,
    presenceState,
    presenceMessage,
    ready,
    refreshingLocation,
    refreshLocation,
    respond,
    activeBookings,
    completed,
    todayStats,
    completionRate,
    incomingJob,
    isOnline,
  };
}
