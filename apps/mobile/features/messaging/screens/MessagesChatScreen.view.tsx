import { styles } from './MessagesChatScreen.styles';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Languages,
  MapPin,
  Paperclip,
  Phone,
  RotateCcw,
  Send,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import type { useMessagesChatScreenController } from '../hooks/useMessagesChatScreenController';

export function ChatView({
  model,
}: {
  model: ReturnType<typeof useMessagesChatScreenController>;
}) {
  const {
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
  } = model;
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
        <TouchableOpacity style={styles.callButton} disabled={!access.canSend}>
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
          {access.canHireAgain && (
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => router.push('/new-request/create')}
            >
              <RotateCcw size={16} color={theme.colors.primary} />
              <Text style={styles.secondaryActionText}>Hire Again</Text>
            </TouchableOpacity>
          )}
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
                        ownMessage ? theme.colors.surface : theme.colors.primary
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
