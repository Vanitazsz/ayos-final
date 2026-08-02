import {
  fetchBookings,
  fetchCustomerProfile,
  fetchProviders,
  fetchServiceCategories,
  subscribeToTable,
  filterServiceCatalog,
} from '../logic/TabsHomeScreenLogic';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useTabsHomeScreenController() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const [visibleCategoryCount, setVisibleCategoryCount] = useState(8);
  const [serviceQuery, setServiceQuery] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  useEffect(() => {
    const load = () =>
      void Promise.all([
        fetchServiceCategories(),
        fetchProviders(),
        fetchCustomerProfile(),
        fetchBookings(),
      ]).then(([catalog, providers, account, bookingRows]) => {
        setCategories(catalog.data);
        setWorkers(providers.data);
        if (!account.error) setProfile(account.data);
        setBookings(bookingRows.data);
      });
    load();
    return subscribeToTable('bookings', load);
  }, []);
  const filteredCategories = useMemo(
    () => filterServiceCatalog(categories, serviceQuery),
    [categories, serviceQuery],
  );
  const hasMoreCategories = visibleCategoryCount < filteredCategories.length;
  const updateServiceQuery = (value: string) => {
    setServiceQuery(value);
    setVisibleCategoryCount(8);
  };
  return {
    router,
    user,
    insets,
    visibleCategoryCount,
    setVisibleCategoryCount,
    serviceQuery,
    categories,
    workers,
    profile,
    bookings,
    filteredCategories,
    hasMoreCategories,
    updateServiceQuery,
    Image,
  };
}
