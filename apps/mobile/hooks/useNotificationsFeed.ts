import { useEffect, useState } from 'react';
import { fetchNotifications, markNotificationRead, subscribeToTable } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

export type NotificationFilter = 'ALL' | 'UNREAD';

export function useNotificationsFeed() {
  const user = useAuthStore((s) => s.user);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>('ALL');

  useEffect(() => {
    const load = () => void fetchNotifications().then((result) => setNotifications(result.data));
    load();
    return subscribeToTable(
      'notifications',
      () => void load(),
      user?.id ? `recipient_id=eq.${user.id}` : undefined,
      undefined,
      ['INSERT', 'UPDATE'],
    );
  }, [user?.id]);

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((rows) =>
      rows.map((row) => (row.id === id ? { ...row, unread: false } : row)),
    );
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => n.unread);
    if (unread.length > 0) {
      await Promise.all(unread.map((n) => markNotificationRead(n.id)));
      setNotifications((rows) => rows.map((row) => ({ ...row, unread: false })));
    }
  };

  return { notifications, filter, setFilter, markRead, markAllRead };
}
