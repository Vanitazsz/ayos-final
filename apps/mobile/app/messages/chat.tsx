import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@/constants/theme';
import {
  ArrowLeft,
  Send,
  Paperclip,
  MapPin,
  Phone,
  Languages,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from 'expo-image';
import {
  fetchBookingDetail,
  fetchConversation,
  fetchConversationForBooking,
  sendMessage,
  startDirectConversationWithUser,
  subscribeToTable,
} from '@/services/api';
import { supabase } from '@/lib/supabase';

export default function ChatScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [participant, setParticipant] = useState({ name: '', avatar: '' });
  const [showOriginal, setShowOriginal] = useState<Set<string>>(new Set());
  const scrollRef = React.useRef<ScrollView>(null);

  const rawId = Array.isArray(searchParams.id) ? searchParams.id[0] : searchParams.id;
  const rawConvId = Array.isArray(searchParams.conversationId)
    ? searchParams.conversationId[0]
    : searchParams.conversationId;
  const rawRecipientId = Array.isArray(searchParams.recipientId)
    ? searchParams.recipientId[0]
    : searchParams.recipientId;

  const bookingId = rawId;

  useEffect(() => {
    let stops: (() => void)[] = [];
    void (async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let targetConvId: string | null = rawConvId ?? null;

      if (rawRecipientId) {
        try {
          const direct = await startDirectConversationWithUser(rawRecipientId);
          if (direct.data?.id) targetConvId = direct.data.id;

          const [{ data: userProf }, { data: workerProf }] = await Promise.all([
            supabase.from('user_profiles').select('display_name, avatar_path').eq('account_id', rawRecipientId).maybeSingle(),
            supabase.from('worker_profiles').select('display_name, avatar_path').eq('account_id', rawRecipientId).maybeSingle(),
          ]);

          const profile = userProf ?? workerProf;
          if (profile) {
            setParticipant({
              name: profile.display_name ?? 'User',
              avatar: profile.avatar_path ?? '',
            });
          }
        } catch (err) {
          console.warn('Failed to start direct conversation:', err);
        }
      } else if (bookingId) {
        const [booking, conversation] = await Promise.all([
          fetchBookingDetail(bookingId).catch(() => ({ data: null, error: true })),
          fetchConversationForBooking(bookingId).catch(() => ({ data: null, error: true })),
        ]);

        if (!booking.error && booking.data) {
          const isWorker = currentUser?.id === booking.data.worker_account_id;
          const otherParty = isWorker
            ? booking.data.user_profiles
            : booking.data.worker_profiles;
          setParticipant({
            name: otherParty?.display_name ?? 'Booking Participant',
            avatar: otherParty?.avatar_path ?? '',
          });
        }

        if (conversation.data?.id) {
          targetConvId = conversation.data.id;
        } else if (!targetConvId) {
          targetConvId = bookingId;
        }
      }

      if (!targetConvId) return;
      setConversationId(targetConvId);

      const activeConvId = targetConvId;
      const load = () =>
        void fetchConversation(activeConvId).then((result) => {
          if (result.error || !result.data || !Array.isArray(result.data.messages)) {
            setMessages([]);
            return;
          }
          setMessages(result.data.messages);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
        });

      loadRef.current = load;
      load();

      const timer = setInterval(load, 1500);
      stops = [
        () => clearInterval(timer),
        subscribeToTable(
          'messages',
          load,
          `conversation_id=eq.${activeConvId}`,
        ),
        subscribeToTable('message_translations', load),
      ];
    })();

    return () => stops.forEach((stop) => stop());
  }, [rawId, rawConvId, rawRecipientId]);

  const loadRef = React.useRef<() => void>(() => {});

  const handleSend = async () => {
    if (!message.trim()) return;
    let activeConvId = conversationId;

    if (!activeConvId && rawRecipientId) {
      try {
        const res = await startDirectConversationWithUser(rawRecipientId);
        if (res.data?.id) {
          activeConvId = res.data.id;
          setConversationId(activeConvId);
        }
      } catch (err) {
        console.warn('Failed to provision conversation on send:', err);
      }
    }

    if (!activeConvId) return;

    try {
      const text = message.trim();
      setMessage('');

      // Optimistically append message to chat UI immediately
      const tempId = 'temp_' + Date.now();
      const optimisticMessage = {
        id: tempId,
        text: text,
        originalText: text,
        translatedText: null,
        isTranslated: false,
        sender: 'self',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

      await sendMessage(activeConvId, text);
      loadRef.current();
    } catch (sendErr) {
      console.warn('Failed to send message:', sendErr);
    }
  };

  const handleHire = () => {
    setShowConfirm(false);
    if (bookingId) router.push(`/tracking/${bookingId}`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Image
            source={participant.avatar}
            style={styles.headerAvatar}
            contentFit="cover"
          />
          <View>
            <Text
              style={[theme.typography.h4, { color: theme.colors.textPrimary }]}
            >
              {participant.name}
            </Text>
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              Booking participant
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.callButton}>
          <Phone color={theme.colors.primary} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.hireBanner}>
        <Text style={[theme.typography.body2, { flex: 1 }]}>
          Ready to start the job?
        </Text>
        <TouchableOpacity
          style={styles.hireButton}
          onPress={() => setShowConfirm(true)}
        >
          <Text
            style={[
              theme.typography.button,
              { color: theme.colors.surface, fontSize: 14 },
            ]}
          >
            Hire Worker
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatScrollContent}
      >
        {messages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 }}>
            <Text style={[theme.typography.body1, { color: theme.colors.textSecondary }]}>
              No messages yet. Say hello! 👋
            </Text>
          </View>
        ) : (
          messages.map((row) => {
            const original = showOriginal.has(row.id);
            return (
              <View
                key={row.id}
                style={
                  row.sender === 'self'
                    ? styles.messageBubbleSender
                    : styles.messageBubbleReceiver
                }
              >
              <Text
                style={[
                  theme.typography.body1,
                  row.sender === 'self' && { color: theme.colors.surface },
                ]}
              >
                {original ? row.originalText : row.text}
              </Text>
              {row.isTranslated && (
                <TouchableOpacity
                  accessibilityLabel={
                    original ? 'Show translation' : 'Show original'
                  }
                  style={styles.translationToggle}
                  onPress={() =>
                    setShowOriginal((current) => {
                      const next = new Set(current);
                      if (next.has(row.id)) next.delete(row.id);
                      else next.add(row.id);
                      return next;
                    })
                  }
                >
                  <Languages
                    size={12}
                    color={
                      row.sender === 'self'
                        ? theme.colors.surface
                        : theme.colors.primary
                    }
                  />
                  <Text
                    style={[
                      styles.translationLabel,
                      row.sender === 'self' && { color: theme.colors.surface },
                    ]}
                  >
                    {original ? 'Show translation' : 'Show original'}
                  </Text>
                </TouchableOpacity>
              )}
              <Text
                style={[
                  styles.messageTime,
                  row.sender === 'self' && { color: theme.colors.borderLight },
                ]}
              >
                {row.isTranslated ? '🌐 ' : ''}
                {row.timestamp}
              </Text>
            </View>
          );
        })
        )}
      </ScrollView>

      <View
        style={[
          styles.inputContainer,
          { paddingBottom: insets.bottom || theme.spacing.md },
        ]}
      >
        <TouchableOpacity style={styles.attachBtn}>
          <Paperclip color={theme.colors.textSecondary} size={20} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.attachBtn}>
          <MapPin color={theme.colors.textSecondary} size={20} />
        </TouchableOpacity>
        <View style={styles.textInputWrapper}>
          <RNTextInput
            style={styles.textInput}
            placeholder="Type a message..."
            value={message}
            onChangeText={setMessage}
            multiline
          />
        </View>
        <TouchableOpacity
          style={styles.sendBtn}
          disabled={!message.trim()}
          onPress={() => void handleSend()}
        >
          <Send
            color={message.trim() ? theme.colors.primary : theme.colors.border}
            size={20}
          />
        </TouchableOpacity>
      </View>

      {showConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text
              style={[theme.typography.h3, { marginBottom: theme.spacing.sm }]}
            >
              Confirm Hiring
            </Text>
            <Text
              style={[
                theme.typography.body1,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.xl,
                  textAlign: 'center',
                },
              ]}
            >
              Continue to live tracking for {participant.name}?
            </Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleHire}
            >
              <Text
                style={[
                  theme.typography.button,
                  { color: theme.colors.surface },
                ]}
              >
                Yes, Hire Worker
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor: theme.colors.background,
                  marginTop: theme.spacing.sm,
                },
              ]}
              onPress={() => setShowConfirm(false)}
            >
              <Text
                style={[
                  theme.typography.button,
                  { color: theme.colors.textPrimary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: theme.spacing.sm,
  },
  callButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  chatArea: { flex: 1 },
  chatScrollContent: { padding: theme.spacing.md },
  messageBubbleReceiver: {
    backgroundColor: theme.colors.surface,
    alignSelf: 'flex-start',
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderBottomLeftRadius: 4,
    maxWidth: '80%',
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  messageBubbleSender: {
    backgroundColor: theme.colors.primary,
    alignSelf: 'flex-end',
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderBottomRightRadius: 4,
    maxWidth: '80%',
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  messageTime: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  translationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  translationLabel: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  attachBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  textInputWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    marginHorizontal: theme.spacing.xs,
    minHeight: 40,
    justifyContent: 'center',
  },
  textInput: {
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hireBanner: {
    backgroundColor: theme.colors.infoBackground,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  hireButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    width: '85%',
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
  },
  modalButton: {
    width: '100%',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
});
