import {
  fetchBookings,
  subscribeToBookingFeed,
  CUSTOMER_BOOKING_TABS,
  getCustomerBookingTab,
  getInitialCustomerBookingTab,
} from '../logic/TabsBookingsScreenLogic';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const RECENT_BOOKINGS_LIMIT = 5;
export function useTabsBookingsScreenController() {
  const router = useRouter();
  const { filter } = useLocalSearchParams<{ filter?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(() =>
    getInitialCustomerBookingTab(filter),
  );
  const [bookings, setBookings] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    setActiveTab(getInitialCustomerBookingTab(filter));
    setShowAll(false);
  }, [filter]);
  const load = () =>
    void fetchBookings().then((result) => {
      if (result.error || !Array.isArray(result.data)) {
        setBookings([]);
        return;
      }
      setBookings(
        result.data.map((row) => {
          const raw = String(row.rawStatus || row.status || '').toUpperCase();
          const tabGroup = getCustomerBookingTab(raw);

          return {
            ...row,
            service: row.category,
            provider: row.providerName,
            location: row.address,
            tabGroup,
            rawStatus: raw,
          };
        }),
      );
    });
  useEffect(() => {
    let active = true;
    let stopRealtime = () => {};
    load();
    void subscribeToBookingFeed('customer', load).then((stop) => {
      if (active) stopRealtime = stop;
      else stop();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => {
      active = false;
      stopRealtime();
      appState.remove();
    };
  }, []);
  const filteredBookings = bookings.filter((b) => b.tabGroup === activeTab);
  const visibleBookings = showAll
    ? filteredBookings
    : filteredBookings.slice(0, RECENT_BOOKINGS_LIMIT);
  return {
    router,
    activeTab,
    setActiveTab,
    showAll,
    setShowAll,
    filteredBookings,
    visibleBookings,
    CUSTOMER_BOOKING_TABS,
    RECENT_BOOKINGS_LIMIT,
  };
}
