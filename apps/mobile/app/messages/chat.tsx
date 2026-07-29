import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Languages,
  MapPin,
  Paperclip,
  Phone,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { theme } from '@/constants/theme';
import { fetchConversationForBooking } from '@/services/api';
import { useConversationChat } from '@/hooks/useConversationChat';

export default function ChatScreen() {
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
  const { messages, access, loading, sending, error, refresh, send, archive } =
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
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
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

  const confirmArchive = () => {
    Alert.alert(
      'Delete conversation?',
      'This closed conversation will be removed from both participants. An administrator-only record will be retained.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            void archive()
              .then(() => router.back())
              .catch((archiveError) =>
                Alert.alert(
                  'Unable to delete',
                  archiveError instanceof Error
                    ? archiveError.message
                    : 'Try again.',
                ),
              ),
        },
      ],
    );
  };

  const handleHire = () => {
    setShowConfirm(false);
    if (rawBookingId) router.push(`/tracking/${rawBookingId}`);
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
            source={access.participant.avatar}
            style={styles.headerAvatar}
            contentFit="cover"
          />
          <View>
            <Text
              style={[theme.typography.h4, { color: theme.colors.textPrimary }]}
            >
              {access.participant.name || 'Booking Participant'}
            </Text>
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              {conversationLabel}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.callButton}
          disabled={!access.canSend}
        >
          <Phone
            color={
              access.canSend ? theme.colors.primary : theme.colors.textTertiary
            }
            size={20}
          />
        </TouchableOpacity>
      </View>

      {access.canSend && rawBookingId ? (
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
      ) : null}

      {!loading && !error && !access.canSend && access.status ? (
        <View style={styles.closedBanner}>
          <Text style={[theme.typography.body2, styles.closedText]}>
            This conversation is read-only because the job is closed.
          </Text>
          <View style={styles.closedActions}>
            {access.canHireAgain && (
              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={() => router.push('/new-request/create')}
              >
                <RotateCcw size={16} color={theme.colors.primary} />
                <Text style={styles.secondaryActionText}>Hire Again</Text>
              </TouchableOpacity>
            )}
            {access.canArchive && (
              <TouchableOpacity
                style={styles.deleteAction}
                onPress={confirmArchive}
              >
                <Trash2 size={16} color={theme.colors.error} />
                <Text style={styles.deleteActionText}>
                  Delete Conversation
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatScrollContent}
      >
        {loading ? (
          <View style={styles.emptyChat}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading messages…</Text>
          </View>
        ) : error ? null : messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Text
              style={[
                theme.typography.body1,
                { color: theme.colors.textSecondary },
              ]}
            >
              No messages yet. Say hello! 👋
            </Text>
          </View>
        ) : (
          messages.map((row) => {
            const original = showOriginal.has(row.id);
            const ownMessage = row.sender === 'self';
            return (
              <View
                key={row.id}
                style={
                  ownMessage
                    ? styles.messageBubbleSender
                    : styles.messageBubbleReceiver
                }
              >
                <Text
                  style={[
                    theme.typography.body1,
                    ownMessage && { color: theme.colors.surface },
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
                        ownMessage
                          ? theme.colors.surface
                          : theme.colors.primary
                      }
                    />
                    <Text
                      style={[
                        styles.translationLabel,
                        ownMessage && { color: theme.colors.surface },
                      ]}
                    >
                      {original ? 'Show translation' : 'Show original'}
                    </Text>
                  </TouchableOpacity>
                )}
                <Text
                  style={[
                    styles.messageTime,
                    ownMessage && { color: theme.colors.borderLight },
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

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => void refresh(true)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          { paddingBottom: insets.bottom || theme.spacing.md },
        ]}
      >
        <TouchableOpacity style={styles.attachBtn} disabled={!access.canSend}>
          <Paperclip
            color={
              access.canSend
                ? theme.colors.textSecondary
                : theme.colors.textTertiary
            }
            size={20}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.attachBtn} disabled={!access.canSend}>
          <MapPin
            color={
              access.canSend
                ? theme.colors.textSecondary
                : theme.colors.textTertiary
            }
            size={20}
          />
        </TouchableOpacity>
        <View style={styles.textInputWrapper}>
          <RNTextInput
            style={styles.textInput}
            placeholder={
              loading
                ? 'Loading conversation...'
                : error
                  ? 'Conversation unavailable'
                  : access.canSend
                    ? 'Type a message...'
                    : 'Conversation is read-only'
            }
            value={message}
            onChangeText={setMessage}
            multiline
            editable={!loading && !error && access.canSend}
          />
        </View>
        <TouchableOpacity
          style={styles.sendBtn}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={!message.trim() || !access.canSend || sending}
          onPress={() => void handleSend()}
        >
          <Send
            color={
              message.trim() && access.canSend && !sending
                ? theme.colors.primary
                : theme.colors.border
            }
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
            <Text style={styles.modalDescription}>
              Continue to live tracking for{' '}
              {access.participant.name || 'this worker'}?
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
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.borderLight,
  },
  callButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
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
  closedBanner: {
    backgroundColor: theme.colors.infoBackground,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  closedText: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  closedActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
  },
  secondaryActionText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  deleteAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
  },
  deleteActionText: {
    color: theme.colors.error,
    fontWeight: '600',
  },
  chatArea: { flex: 1 },
  chatScrollContent: { padding: theme.spacing.md },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
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
  errorContainer: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  errorText: { color: theme.colors.error, textAlign: 'center' },
  retryText: { color: theme.colors.primary, fontWeight: '600' },
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
  modalDescription: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  modalButton: {
    width: '100%',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
});
