import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Send } from 'lucide-react-native';
import { Colors, Radius, Spacing, Elevation } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { fetchConversationForBooking } from '@/services/api';
import { useConversationChat } from '@/hooks/useConversationChat';

interface BookingChatProps {
  customerName: string;
  customerAvatar: string;
  onConfirmDetails: () => void;
  bookingId: string;
  bookingStatus?: string;
}

export const BookingChat = React.memo(function BookingChat({
  customerName,
  customerAvatar,
  onConfirmDetails,
  bookingId,
  bookingStatus,
}: BookingChatProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const { messages, access, sending, send } =
    useConversationChat(conversationId);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !access.canSend) return;
    await send(trimmed);
    setInputText('');
  };

  useEffect(() => {
    void fetchConversationForBooking(bookingId).then((result) => {
      if (!result.error && result.data?.id) setConversationId(result.data.id);
    });
  }, [bookingId]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  const canConfirm = bookingStatus === 'accepted';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.chatHeader}>
        <Avatar uri={customerAvatar} size={32} />
        <View style={styles.chatHeaderInfo}>
          <AppText variant="bodySm" weight="semiBold">{customerName}</AppText>
          <AppText variant="caption" color={Colors.textTertiary}>Messaging</AppText>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.sender === 'self' ? styles.workerBubble : styles.customerBubble,
            ]}
          >
            <AppText
              variant="bodySm"
              color={msg.sender === 'self' ? Colors.white : Colors.textPrimary}
            >
              {msg.text}
            </AppText>
            <AppText
              variant="caption"
              color={msg.sender === 'self' ? 'rgba(255,255,255,0.7)' : Colors.textTertiary}
              style={styles.msgTime}
            >
              {msg.timestamp}
            </AppText>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          editable={access.canSend}
        />
        <Pressable
          style={[
            styles.sendBtn,
            (!inputText.trim() || !access.canSend || sending) &&
              styles.sendBtnDisabled,
          ]}
          onPress={() => void handleSend()}
          disabled={!inputText.trim() || !access.canSend || sending}
        >
          <Send size={18} color={Colors.white} />
        </Pressable>
      </View>

      <Pressable
        style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
        onPress={canConfirm ? onConfirmDetails : undefined}
        disabled={!canConfirm}
      >
        <AppText
          variant="bodySm"
          weight="semiBold"
          color={canConfirm ? Colors.white : Colors.textTertiary}
        >
          {canConfirm ? '✓ Confirm Details' : 'Send a message to confirm'}
        </AppText>
      </Pressable>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Elevation.sm,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    padding: Spacing['3'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  chatHeaderInfo: {
    gap: 2,
  },
  messageList: {
    maxHeight: 200,
  },
  messageListContent: {
    padding: Spacing['3'],
    gap: Spacing['2'],
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['2'],
    borderRadius: Radius.lg,
  },
  workerBubble: {
    backgroundColor: Colors.cta,
    alignSelf: 'flex-end',
    borderBottomRightRadius: Radius.xs,
  },
  customerBubble: {
    backgroundColor: Colors.surfaceLight,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: Radius.xs,
  },
  msgTime: {
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing['2'],
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['2'],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 80,
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['2'],
    fontSize: 14,
    color: Colors.textPrimary,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.border,
  },
  confirmBtn: {
    marginHorizontal: Spacing['3'],
    marginBottom: Spacing['3'],
    paddingVertical: Spacing['2'],
    borderRadius: Radius.lg,
    backgroundColor: Colors.cta,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
});
