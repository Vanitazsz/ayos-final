import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markNotificationRead } from '@/services/api';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import {
  queryKeys,
  QUERY_STALE_TIMES,
  toQueryData,
} from '@/services/queryUtils';

export type NotificationFilter = 'ALL' | 'UNREAD';

export function useNotificationsFeed() {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationFilter>('ALL');

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications(userId ?? 'anonymous'),
    queryFn: async () => toQueryData(await fetchNotifications()),
    staleTime: QUERY_STALE_TIMES.list,
    enabled: Boolean(userId),
  });
  const notifications = notificationsQuery.data ?? [];

  useEffect(() => {
    if (!userId) return;
    const invalidate = () =>
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(userId),
      });
    const channel = supabase
      .channel(`user:${userId}:notifications`, {
        config: { private: true },
      })
      .on('broadcast', { event: '*' }, invalidate)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    queryClient.setQueryData<unknown[]>(
      queryKeys.notifications(userId ?? 'anonymous'),
      (rows) =>
        (rows ?? []).map((row: any) =>
          row.id === id ? { ...row, unread: false } : row,
        ),
    );
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => n.unread);
    if (unread.length > 0) {
      await Promise.all(unread.map((n) => markNotificationRead(n.id)));
      queryClient.setQueryData<unknown[]>(
        queryKeys.notifications(userId ?? 'anonymous'),
        (rows) => (rows ?? []).map((row: any) => ({ ...row, unread: false })),
      );
    }
  };

  return { notifications, filter, setFilter, markRead, markAllRead };
}
