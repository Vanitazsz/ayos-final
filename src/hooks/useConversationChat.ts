import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { fetchConversation, sendMessage } from '@/services/messaging';
import { subscribeToTable } from '@/services/realtime';
import {
  createOptimisticMessage,
  mergeConversationMessages,
  type ConversationMessage,
} from '@/services/chatRealtime';

interface ConversationAccess {
  bookingId: string | null;
  serviceRequestId: string | null;
  status: string;
  canSend: boolean;
  canArchive: boolean;
  canHireAgain: boolean;
  participant: { name: string; avatar: string };
}

const EMPTY_ACCESS: ConversationAccess = {
  bookingId: null,
  serviceRequestId: null,
  status: '',
  canSend: false,
  canArchive: false,
  canHireAgain: false,
  participant: { name: '', avatar: '' },
};

export function useConversationChat(conversationId: string | null) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [access, setAccess] = useState<ConversationAccess>(EMPTY_ACCESS);
  const [loading, setLoading] = useState(Boolean(conversationId));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);

  const refresh = useCallback(
    async (showLoading = false) => {
      if (showLoading && mounted.current) setLoading(true);
      if (!conversationId) {
        if (mounted.current) {
          setMessages([]);
          setAccess(EMPTY_ACCESS);
          setLoading(false);
        }
        return;
      }
      const result = await fetchConversation(conversationId);
      if (!mounted.current) return;
      if (result.error || !result.data) {
        setError(result.error ?? 'Conversation is unavailable');
        setLoading(false);
        return;
      }
      setError('');
      setAccess({
        bookingId: result.data.bookingId ?? null,
        serviceRequestId: result.data.serviceRequestId ?? null,
        status: result.data.status ?? '',
        canSend: Boolean(result.data.canSend),
        canArchive: Boolean(result.data.canArchive),
        canHireAgain: Boolean(result.data.canHireAgain),
        participant: result.data.participant ?? EMPTY_ACCESS.participant,
      });
      setMessages((current) =>
        mergeConversationMessages([
          ...(result.data.messages as ConversationMessage[]),
          ...current.filter((message) => message.optimistic),
        ]),
      );
      setLoading(false);
    },
    [conversationId],
  );

  useEffect(() => {
    mounted.current = true;
    void refresh(true);
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!conversationId) return;
    const stops = [
      subscribeToTable(
        'messages',
        () => void refresh(),
        `conversation_id=eq.${conversationId}`,
        undefined,
        ['INSERT'],
      ),
      subscribeToTable(
        'conversations',
        () => void refresh(),
        `id=eq.${conversationId}`,
        undefined,
        ['INSERT', 'UPDATE'],
      ),
    ];
    const broadcastChannel = supabase
      .channel(`conversation:${conversationId}:messages`, {
        config: { private: true },
      })
      .on('broadcast', { event: '*' }, () => void refresh())
      .subscribe();
    stops.push(() => {
      void supabase.removeChannel(broadcastChannel);
    });
    return () => {
      stops.forEach((stop) => stop());
    };
  }, [conversationId, refresh]);

  useEffect(() => {
    const stops: (() => void)[] = [];
    if (access.bookingId) {
      stops.push(
        subscribeToTable(
          'bookings',
          () => void refresh(),
          `id=eq.${access.bookingId}`,
          undefined,
          ['INSERT', 'UPDATE'],
        ),
      );
    }
    if (access.serviceRequestId) {
      stops.push(
        subscribeToTable(
          'service_requests',
          () => void refresh(),
          `id=eq.${access.serviceRequestId}`,
          undefined,
          ['INSERT', 'UPDATE'],
        ),
      );
    }
    return () => stops.forEach((stop) => stop());
  }, [access.bookingId, access.serviceRequestId, refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const send = useCallback(
    async (text: string) => {
      const normalized = text.trim();
      if (!conversationId || !normalized || !access.canSend || sending) return;
      const optimistic = createOptimisticMessage(normalized);
      setSending(true);
      setError('');
      setMessages((current) =>
        mergeConversationMessages([...current, optimistic]),
      );
      try {
        const persisted = await sendMessage(conversationId, normalized);
        setMessages((current) =>
          mergeConversationMessages(
            current.map((message) =>
              message.id === optimistic.id
                ? {
                    ...message,
                    id: persisted.id,
                    createdAt: persisted.created_at,
                    optimistic: false,
                  }
                : message,
            ),
          ),
        );
        await refresh();
      } catch (sendError) {
        setMessages((current) =>
          current.filter((message) => message.id !== optimistic.id),
        );
        setError(
          sendError instanceof Error
            ? sendError.message
            : 'Message could not be sent',
        );
        throw sendError;
      } finally {
        if (mounted.current) setSending(false);
      }
    },
    [access.canSend, conversationId, refresh, sending],
  );

  return {
    messages,
    access,
    loading,
    sending,
    error,
    refresh,
    send,
  };
}
