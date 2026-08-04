import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  archiveConversations,
  fetchConversations,
  subscribeToConversationBroadcast,
} from '../logic/ConversationListScreenLogic';
import { subscribeToTable } from '@/services/realtime';

export function useConversationListScreenController() {
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const deletableIds = useMemo(
    () => chats.filter((chat) => chat.canArchive).map((chat) => chat.id),
    [chats],
  );
  const allSelected =
    deletableIds.length > 0 &&
    deletableIds.every((conversationId) => selectedIds.has(conversationId));

  const load = useCallback((showLoading = false) => {
    if (showLoading) setLoading(true);
    void fetchConversations().then((result) => {
      if (result.error) {
        setError(result.error);
      } else {
        const nextChats = result.data ?? [];
        setChats(nextChats);
        setSelectedIds((current) => {
          const available = new Set(
            nextChats
              .filter((chat: any) => chat.canArchive)
              .map((chat: any) => chat.id),
          );
          return new Set(
            [...current].filter((conversationId) =>
              available.has(conversationId),
            ),
          );
        });
        setError('');
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load(true);
    const stops = [
      subscribeToTable('messages', () => load()),
      subscribeToTable('conversations', () => load()),
    ];
    return () => stops.forEach((stop) => stop());
  }, [load]);

  useEffect(() => {
    const stops = chats.map((chat) =>
      subscribeToConversationBroadcast(chat.id, () => load()),
    );
    return () => stops.forEach((stop) => stop());
  }, [chats, load]);

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setConfirmingDelete(false);
  };

  const toggleConversation = (conversationId: string) => {
    setConfirmingDelete(false);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(conversationId)) next.delete(conversationId);
      else next.add(conversationId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setConfirmingDelete(false);
    setSelectedIds(allSelected ? new Set() : new Set(deletableIds));
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0 || deleting) return;
    setDeleting(true);
    const result = await archiveConversations([...selectedIds]);
    setDeleting(false);

    if (result.failed.length > 0) {
      setSelectedIds(new Set(result.failed.map(({ id }) => id)));
      setConfirmingDelete(false);
      Alert.alert(
        'Some conversations were not deleted',
        `${result.deleted.length} deleted, ${result.failed.length} failed. Try the remaining conversations again.`,
      );
    } else {
      exitSelectionMode();
    }
    load();
  };

  const openChat = (chat: { id: string; bookingId?: string | null }) => {
    router.push(
      `/messages/chat?${
        chat.bookingId ? `id=${chat.bookingId}` : `conversationId=${chat.id}`
      }` as any,
    );
  };

  return {
    router,
    chats,
    loading,
    error,
    load,
    selectionMode,
    setSelectionMode,
    confirmingDelete,
    setConfirmingDelete,
    deleting,
    selectedIds,
    deletableIds,
    allSelected,
    exitSelectionMode,
    toggleConversation,
    toggleSelectAll,
    deleteSelected,
    openChat,
  };
}
