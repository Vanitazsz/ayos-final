import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Send } from 'lucide-react-native';
import { Colors, Radius, Spacing, Elevation } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { fetchConversation, fetchConversationForBooking, sendMessage, subscribeToTable } from '@/services/api';

interface Message {
  id: string;
  text: string;
  sender: 'worker' | 'customer';
  timestamp: string;
}

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId,setConversationId]=useState<string|null>(null);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    if(!conversationId)return;
    await sendMessage(conversationId,trimmed);
    setInputText('');
  };

  useEffect(()=>{let stop=()=>{};const load=async()=>{const result=await fetchConversationForBooking(bookingId);if(result.error)return;setConversationId(result.data.id);const refresh=()=>void fetchConversation(result.data.id).then((value)=>{if(value.error||!value.data||!Array.isArray(value.data.messages)){setMessages([]);return;}setMessages(value.data.messages.map((row:any)=>({id:row.id,text:row.text,sender:row.sender==='self'?'worker':'customer',timestamp:row.timestamp})))});refresh();stop=subscribeToTable('messages',refresh,`conversation_id=eq.${result.data.id}`);};void load();return()=>stop();},[bookingId]);

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
              msg.sender === 'worker' ? styles.workerBubble : styles.customerBubble,
            ]}
          >
            <AppText
              variant="bodySm"
              color={msg.sender === 'worker' ? Colors.white : Colors.textPrimary}
            >
              {msg.text}
            </AppText>
            <AppText
              variant="caption"
              color={msg.sender === 'worker' ? 'rgba(255,255,255,0.7)' : Colors.textTertiary}
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
        />
        <Pressable
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
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
