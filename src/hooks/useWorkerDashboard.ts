import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  queryKeys,
  QUERY_STALE_TIMES,
  toQueryData,
} from '@/services/queryUtils';
import { useAuthStore } from '@/store/useAuthStore';

export function useWorkerDashboard() {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [dispatchOffers, setDispatchOffers] = useState<DispatchOffer[]>([]);
  const { state: presenceState, message: presenceMessage } =
    useWorkerPresence();
  const ready = presenceState !== 'starting';
  const [liveStatus, setLiveStatus] = useState<WorkerLiveStatus | null>(null);
  const [refreshingLocation, setRefreshingLocation] = useState(false);

  const profileQuery = useQuery({
    queryKey: queryKeys.workerProfile(userId ?? 'anonymous'),
    queryFn: async () => toQueryData(await fetchWorkerProfile()),
    staleTime: QUERY_STALE_TIMES.profile,
    enabled: Boolean(userId),
  });
  const bookingsQuery = useQuery({
    queryKey: queryKeys.workerBookings(userId ?? 'anonymous'),
    queryFn: async () => toQueryData(await fetchWorkerBookings()),
    staleTime: QUERY_STALE_TIMES.list,
    enabled: Boolean(userId),
  });
  const transactionsQuery = useQuery({
    queryKey: queryKeys.walletTransactions(userId ?? 'anonymous'),
    queryFn: async () => toQueryData(await fetchWalletTransactions()),
    staleTime: QUERY_STALE_TIMES.list,
    enabled: Boolean(userId),
  });

  const workerProfile = profileQuery.data ?? null;
  const workerBookings = bookingsQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];

  const earnings = useMemo(() => {
    const completedBookingSum = (workerBookings ?? [])
      .filter((row) => row.status === 'completed')
      .reduce(
        (sum, row) => sum + Number(row.price.replace(/[^0-9.]/g, '') || 0),
        0,
      );
    const walletTxSum = (transactions ?? [])
      .filter((row) => row.credit && row.status === 'completed')
      .reduce(
        (sum, row) => sum + Number(row.amount.replace(/[^0-9.]/g, '') || 0),
        0,
      );
    const profileEarnings = workerProfile?.earnings
      ? Number(workerProfile.earnings.replace(/[^0-9.]/g, '') || 0)
      : 0;
    const validWalletTxSum = walletTxSum < 1000000000 ? walletTxSum : 0;
    return profileEarnings || completedBookingSum || validWalletTxSum;
  }, [workerProfile, workerBookings, transactions]);

  useEffect(() => {
    if (!userId) return;
    const stops = [
      subscribeToTable(
        'bookings',
        () =>
          void queryClient.invalidateQueries({
            queryKey: queryKeys.workerBookings(userId),
          }),
        `worker_account_id=eq.${userId}`,
        undefined,
        ['INSERT', 'UPDATE'],
      ),
      subscribeToTable(
        'service_requests',
        () =>
          void queryClient.invalidateQueries({
            queryKey: queryKeys.workerBookings(userId),
          }),
        `selected_worker_id=eq.${userId}`,
        undefined,
        ['INSERT', 'UPDATE'],
      ),
      subscribeToTable(
        'wallet_transactions',
        () =>
          void queryClient.invalidateQueries({
            queryKey: queryKeys.walletTransactions(userId),
          }),
        `wallet_account_id=eq.${userId}`,
        undefined,
        ['INSERT', 'UPDATE'],
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }, [userId, queryClient]);

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
