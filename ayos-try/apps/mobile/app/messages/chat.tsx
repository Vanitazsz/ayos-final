import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  EllipsisVertical,
  Languages,
  Paperclip,
  Send,
  ShieldCheck,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import {
  fetchBookingDetail,
  fetchConversation,
  fetchConversationForBooking,
  sendMessage,
  subscribeToTable,
} from '@/services/api';
import { supabase } from '@/lib/supabase';

const quickReplies = ["I'm here.", 'Please call me.', 'Where are you now?'];

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const bookingId = Array.isArray(id) ? id[0] : id;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [participant, setParticipant] = useState({ name: '', avatar: '' });
  const [showOriginal, setShowOriginal] = useState<Set<string>>(new Set());
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!bookingId) return;
    let stops: (() => void)[] = [];
    void (async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      const [booking, conversation] = await Promise.all([
        fetchBookingDetail(bookingId),
        fetchConversationForBooking(bookingId),
      ]);
      if (!booking.error && booking.data) {
        const isWorker = currentUser?.id === booking.data.worker_account_id;
        const otherParty = isWorker
          ? booking.data.user_profiles
          : booking.data.worker_profiles;
        setParticipant({
          name: otherParty?.display_name ?? 'Profile unavailable',
          avatar: otherParty?.avatar_path ?? '',
        });
      }
      if (conversation.error || !conversation.data?.id) return;
      setConversationId(conversation.data.id);
      const load = () =>
        void fetchConversation(conversation.data.id).then((result) => {
          setMessages(
            !result.error && result.data && Array.isArray(result.data.messages)
              ? result.data.messages
              : [],
          );
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
        });
      load();
      stops = [
        subscribeToTable('messages', load, `conversation_id=eq.${conversation.data.id}`),
        subscribeToTable('message_translations', load),
      ];
    })();
    return () => stops.forEach((stop) => stop());
  }, [bookingId]);

  const submit = async () => {
    if (!conversationId || !message.trim()) return;
    await sendMessage(conversationId, message);
    setMessage('');
  };

  const openSafetyMenu = () =>
    Alert.alert('Conversation options', 'Choose an action for this conversation.', [
      { text: 'Report user', onPress: () => router.push('/account/report-user') },
      {
        text: 'Block user',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Block request',
            'Blocking is reviewed with your safety report so active bookings are handled correctly.',
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <ArrowLeft color={theme.colors.textPrimary} size={23} />
        </TouchableOpacity>
        <View style={styles.participant}>
          <Image source={participant.avatar || undefined} style={styles.avatar} contentFit="cover" />
          <View>
            <Text style={styles.name} numberOfLines={1}>{participant.name || 'Conversation'}</Text>
            <View style={styles.onlineRow}><View style={styles.onlineDot} /><Text style={styles.onlineText}>Available</Text></View>
          </View>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={openSafetyMenu}>
          <EllipsisVertical color={theme.colors.primary} size={22} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.bookingShortcut}
        onPress={() => bookingId && router.push(`/booking/${bookingId}`)}
      >
        <View style={styles.bookingIcon}><ShieldCheck color={theme.colors.primary} size={19} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bookingTitle}>View booking details</Text>
          <Text style={styles.bookingText}>Status, address, schedule, and payment</Text>
        </View>
        <ChevronRight color={theme.colors.textTertiary} size={19} />
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyTitle}>Start the conversation</Text>
            <Text style={styles.emptyText}>Keep service details and updates here so they remain connected to your booking.</Text>
          </View>
        ) : messages.map((row) => {
          const own = row.sender === 'self';
          const original = showOriginal.has(row.id);
          return (
            <View key={row.id} style={[styles.bubble, own ? styles.ownBubble : styles.otherBubble]}>
              <Text style={[styles.messageText, own && styles.ownText]}>
                {original ? row.originalText : row.text}
              </Text>
              {row.isTranslated ? (
                <TouchableOpacity
                  style={styles.translation}
                  onPress={() =>
                    setShowOriginal((current) => {
                      const next = new Set(current);
                      if (next.has(row.id)) next.delete(row.id);
                      else next.add(row.id);
                      return next;
                    })
                  }
                >
                  <Languages size={11} color={own ? '#FFFFFF' : theme.colors.primary} />
                  <Text style={[styles.translationText, own && styles.ownText]}>
                    {original ? 'Show translation' : 'Show original'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <Text style={[styles.time, own && styles.ownTime]}>{row.timestamp}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.safety}>
        <ShieldCheck color={theme.colors.success} size={15} />
        <Text style={styles.safetyText}>Keep communication and payments in A-yos for your safety.</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.replies} contentContainerStyle={styles.repliesContent}>
        {quickReplies.map((reply) => (
          <TouchableOpacity key={reply} style={styles.reply} onPress={() => setMessage(reply)}>
            <Text style={styles.replyText}>{reply}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: insets.bottom || 12 }]}>
        <TouchableOpacity style={styles.composerIcon} accessibilityLabel="Attach file">
          <Paperclip color={theme.colors.textSecondary} size={19} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.composerIcon} accessibilityLabel="Add photo">
          <Camera color={theme.colors.textSecondary} size={19} />
        </TouchableOpacity>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          style={styles.input}
        />
        <TouchableOpacity
          style={[styles.send, !message.trim() && styles.sendDisabled]}
          disabled={!message.trim()}
          onPress={() => void submit()}
        >
          <Send color="#FFFFFF" size={18} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  participant: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.border },
  name: { maxWidth: 190, color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.success },
  onlineText: { color: theme.colors.textSecondary, fontSize: 11 },
  bookingShortcut: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, padding: 12, backgroundColor: theme.colors.surface, borderRadius: 14, ...theme.shadows.sm },
  bookingIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.infoBackground, alignItems: 'center', justifyContent: 'center' },
  bookingTitle: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' },
  bookingText: { color: theme.colors.textSecondary, fontSize: 10, marginTop: 3 },
  chat: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingVertical: 8 },
  emptyChat: { minHeight: 220, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyTitle: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '700' },
  emptyText: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, marginBottom: 9 },
  ownBubble: { alignSelf: 'flex-end', backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
  otherBubble: { alignSelf: 'flex-start', backgroundColor: theme.colors.surface, borderBottomLeftRadius: 4, ...theme.shadows.sm },
  messageText: { color: theme.colors.textPrimary, fontSize: 14, lineHeight: 20 },
  ownText: { color: '#FFFFFF' },
  translation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  translationText: { color: theme.colors.primary, fontSize: 10, fontWeight: '600' },
  time: { color: theme.colors.textTertiary, fontSize: 9, alignSelf: 'flex-end', marginTop: 5 },
  ownTime: { color: 'rgba(255,255,255,0.72)' },
  safety: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: theme.colors.successBackground, paddingHorizontal: 14, paddingVertical: 8 },
  safetyText: { flex: 1, color: theme.colors.textSecondary, fontSize: 10 },
  replies: { flexGrow: 0, backgroundColor: theme.colors.surface },
  repliesContent: { gap: 7, paddingHorizontal: 12, paddingVertical: 9 },
  reply: { minHeight: 34, borderRadius: 17, borderWidth: 1, borderColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  replyText: { color: theme.colors.primary, fontSize: 11, fontWeight: '600' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.borderLight, paddingHorizontal: 10, paddingTop: 9 },
  composerIcon: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, maxHeight: 100, minHeight: 42, borderRadius: 21, backgroundColor: theme.colors.background, color: theme.colors.textPrimary, paddingHorizontal: 14, paddingVertical: 10 },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
});
