import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchBookings,
  fetchCustomerProfile,
  fetchProviders,
  fetchServiceCategories,
  subscribeToTable,
} from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

export function useHomeData() {
  const user = useAuthStore((s: any) => s.user);
  const [categories, setCategories] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const mounted = useRef(true);

  const load = useCallback(() => {
    void Promise.all([
      fetchServiceCategories(),
      fetchProviders(),
      fetchCustomerProfile(),
      fetchBookings(),
    ]).then(([catalog, providers, account, bookingRows]) => {
      if (!mounted.current) return;
      setCategories(catalog.data);
      setWorkers(providers.data);
      if (!account.error) setProfile(account.data);
      setBookings(bookingRows.data);
    });
  }, []);

  const debouncedLoad = useDebouncedCallback(() => void load(), 400);

  useEffect(() => {
    mounted.current = true;
    let unsubscribe: (() => void) | null = null;
    load();
    unsubscribe = subscribeToTable(
      'bookings',
      debouncedLoad,
      user?.id ? `user_account_id=eq.${user.id}` : undefined,
      undefined,
      ['INSERT', 'UPDATE'],
    );
    return () => {
      mounted.current = false;
      unsubscribe?.();
    };
  }, [load, debouncedLoad, user?.id]);

  const activeBookingsCount = useMemo(
    () => bookings.filter((row) => !['completed', 'cancelled'].includes(row.status)).length,
    [bookings],
  );

  const lastCompletedWorkerName = useMemo(
    () => bookings.find((row) => row.status === 'completed')?.providerName ?? 'No completed booking',
    [bookings],
  );

  return { user, categories, workers, profile, bookings, activeBookingsCount, lastCompletedWorkerName };
}
