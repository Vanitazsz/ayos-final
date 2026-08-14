import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  fetchBookings,
  fetchServiceCategories,
  fetchProviders,
  subscribeToTable,
} from '@/services/api';
import {
  queryKeys,
  QUERY_STALE_TIMES,
  toQueryData,
} from '@/services/queryUtils';
import { useAuthStore } from '@/store/useAuthStore';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useCustomerProfile } from '@/hooks/useProfile';

export function useHomeData() {
  const user = useAuthStore((s: any) => s.user);
  const userId = user?.id;
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalogCategories,
    queryFn: async () => toQueryData(await fetchServiceCategories()),
    staleTime: QUERY_STALE_TIMES.catalog,
  });
  const providersQuery = useQuery({
    queryKey: queryKeys.catalogProviders,
    queryFn: async () => toQueryData(await fetchProviders()),
    staleTime: QUERY_STALE_TIMES.catalog,
  });
  const profileQuery = useCustomerProfile();
  const bookingsQuery = useQuery({
    queryKey: queryKeys.customerBookings(userId ?? 'anonymous'),
    queryFn: async () => toQueryData(await fetchBookings()),
    staleTime: QUERY_STALE_TIMES.list,
    enabled: Boolean(userId),
  });

  const debouncedInvalidateBookings = useDebouncedCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.customerBookings(userId ?? 'anonymous'),
    });
  }, 400);

  useEffect(() => {
    if (!userId) return;
    return subscribeToTable(
      'bookings',
      debouncedInvalidateBookings,
      `user_account_id=eq.${userId}`,
      undefined,
      ['INSERT', 'UPDATE'],
    );
  }, [userId, debouncedInvalidateBookings]);

  const categories = categoriesQuery.data ?? [];
  const workers = providersQuery.data ?? [];
  const profile = profileQuery.data ?? null;
  const bookings = bookingsQuery.data ?? [];

  const activeBookingsCount = useMemo(
    () =>
      bookings.filter((row) => !['completed', 'cancelled'].includes(row.status))
        .length,
    [bookings],
  );

  const lastCompletedWorkerName = useMemo(
    () =>
      bookings.find((row) => row.status === 'completed')?.providerName ??
      'No completed booking',
    [bookings],
  );

  return {
    user,
    categories,
    workers,
    profile,
    bookings,
    activeBookingsCount,
    lastCompletedWorkerName,
  };
}
