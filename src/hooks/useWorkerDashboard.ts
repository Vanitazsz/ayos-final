import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const NOT_SELECTED_DISMISS_MS = 10_000;
const REFETCH_DEBOUNCE_MS = 500;

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function useWorkerDashboard() {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [dispatchOffers, setDispatchOffers] = useState<DispatchOffer[]>([]);
  const { state: presenceState, message: presenceMessage } =
    useWorkerPresence();
  const ready = presenceState !== 'starting';
  const [liveStatus, setLiveStatus] = useState<WorkerLiveStatus | null>(null);
  const [refreshingLocation, setRefreshingLocation] = useState(false);
  const acceptedIdsRef = useRef(new Set<string>());
  const dismissTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

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

    const processRows = (rows: DispatchOffer[]) => {
      if (!active) return;

      const currentIds = new Set(rows.map((r) => r.dispatchId));
      const disappeared = [...acceptedIdsRef.current].filter(
        (id) => !currentIds.has(id),
      );

      if (disappeared.length > 0) {
        for (const id of disappeared) {
          acceptedIdsRef.current.delete(id);
        }
        setDispatchOffers((prev) =>
          prev.map((o) =>
            disappeared.includes(o.dispatchId)
              ? { ...o, notSelected: true }
              : o,
          ),
        );
        for (const id of disappeared) {
          const timer = setTimeout(() => {
            dismissTimersRef.current.delete(id);
            setDispatchOffers((prev) =>
              prev.filter((o) => o.dispatchId !== id),
            );
          }, NOT_SELECTED_DISMISS_MS);
          dismissTimersRef.current.set(id, timer);
        }
      } else {
        setDispatchOffers(rows);
      }
    };

    const loadOffers = () =>
      void getMyDispatchOffers()
        .then(processRows)
        .catch(() => {});

    const loadLiveStatus = () =>
      void getMyWorkerLiveStatus()
        .then((status) => {
          if (active) setLiveStatus(status);
        })
        .catch(() => {});

    loadOffers();
    loadLiveStatus();

    const debouncedLoadOffers = debounce(loadOffers, REFETCH_DEBOUNCE_MS);
    const stopDispatch = subscribeToDispatch(debouncedLoadOffers);
    return () => {
      active = false;
      stopDispatch();
      dismissTimersRef.current.forEach((t) => clearTimeout(t));
      dismissTimersRef.current.clear();
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
      if (response === 'ACCEPTED') {
        acceptedIdsRef.current.add(offer.dispatchId);
      }
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
        (o) =>
          o.status === 'OFFERED' ||
          o.status === 'VIEWED' ||
          o.status === 'ACCEPTED' ||
          o.notSelected,
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
