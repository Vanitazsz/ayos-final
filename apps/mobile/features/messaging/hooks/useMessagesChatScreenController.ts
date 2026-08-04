import { fetchConversationForBooking } from '../logic/MessagesChatScreenLogic';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useConversationChat } from '@/hooks/useConversationChat';

export function useMessagesChatScreenController() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState<Set<string>>(new Set());
  const scrollRef = useRef<ScrollView>(null);
  const unavailableHandled = useRef(false);
  const rawBookingId = Array.isArray(searchParams.id)
    ? searchParams.id[0]
    : searchParams.id;
  const rawConversationId = Array.isArray(searchParams.conversationId)
    ? searchParams.conversationId[0]
    : searchParams.conversationId;
  const { messages, access, loading, sending, error, refresh, send } =
    useConversationChat(conversationId);
  const conversationLabel = loading
    ? 'Loading conversation…'
    : error
      ? 'Unable to load conversation'
      : access.canSend
        ? 'Matched conversation'
        : access.status
          ? 'Read-only history'
          : 'Conversation unavailable';
  useEffect(() => {
    if (rawConversationId) {
      setConversationId(rawConversationId);
      return;
    }
    if (!rawBookingId) return;
    void fetchConversationForBooking(rawBookingId).then((result) => {
      if (!result.error && result.data?.id) {
        setConversationId(result.data.id);
      }
    });
  }, [rawBookingId, rawConversationId]);
  useEffect(() => {
    const timer = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      80,
    );
    return () => clearTimeout(timer);
  }, [messages.length]);
  useEffect(() => {
    if (
      conversationId &&
      error === 'Conversation is unavailable' &&
      !unavailableHandled.current
    ) {
      unavailableHandled.current = true;
      Alert.alert(
        'Conversation deleted',
        'This conversation is no longer available.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    }
  }, [conversationId, error, router]);
  const handleSend = async () => {
    const normalized = message.trim();
    if (!normalized || !access.canSend) return;
    setMessage('');
    try {
      await send(normalized);
    } catch {
      setMessage(normalized);
    }
  };
  const handleHire = () => {
    setShowConfirm(false);
    if (rawBookingId) router.push(`/tracking/${rawBookingId}`);
  };
  return {
    router,
    insets,
    message,
    setMessage,
    showConfirm,
    setShowConfirm,
    showOriginal,
    setShowOriginal,
    scrollRef,
    rawBookingId,
    messages,
    access,
    loading,
    sending,
    error,
    refresh,
    conversationLabel,
    handleSend,
    handleHire,
    Image,
  };
}
