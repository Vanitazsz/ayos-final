import {
  fetchNotifications,
  markNotificationRead,
  subscribeToTable,
} from '../logic/NotificationsScreenLogic';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useNotificationsScreenController() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<any[]>([]);
  useEffect(() => {
    const load = () =>
      void fetchNotifications().then((result) => setNotifications(result.data));
    load();
    return subscribeToTable('notifications', load);
  }, []);
  return { router, notifications, setNotifications, markNotificationRead };
}
