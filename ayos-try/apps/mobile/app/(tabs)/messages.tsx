import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import {
  CustomerEmptyState,
  CustomerPage,
  PageHeader,
  customerColors,
} from '@/components/customer/CustomerUI';
import { fetchConversations, subscribeToTable } from '@/services/api';

export default function MessagesListScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = () =>
      void fetchConversations().then((result) => {
        setChats(result.data);
        setError(result.error ?? '');
        setLoading(false);
      });
    load();
    return subscribeToTable('messages', load);
  }, []);

  return (
    <CustomerPage scroll={false} testID="customer-messages">
      <PageHeader title="Messages" subtitle="Stay connected with your workers" />
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={customerColors.primary} /></View>
      ) : chats.length === 0 ? (
        <CustomerEmptyState
          icon={MessageCircle}
          title={error ? 'Messages unavailable' : 'No messages yet'}
          description={error || 'Your conversations with workers will appear here.'}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {chats.map((chat) => (
            <Pressable
              key={chat.id}
              accessibilityRole="button"
              accessibilityLabel={`Conversation with ${chat.name}`}
              onPress={() => router.push(`/messages/chat?id=${chat.bookingId}` as any)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.avatarWrap}>
                {chat.avatar ? (
                  <Image source={chat.avatar} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={styles.avatarFallback}><Text style={styles.initial}>{chat.name.charAt(0)}</Text></View>
                )}
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.copy}>
                <View style={styles.nameRow}>
                  <Text numberOfLines={1} style={[styles.name, chat.unread > 0 && styles.unreadName]}>{chat.name}</Text>
                  <Text style={[styles.time, chat.unread > 0 && styles.unreadTime]}>{chat.time}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text
                    numberOfLines={1}
                    style={[styles.preview, chat.unread > 0 && styles.unreadPreview]}
                  >
                    {chat.lastMessage || 'Start the conversation'}
                  </Text>
                  {chat.unread > 0 ? (
                    <View style={styles.badge}><Text style={styles.badgeText}>{Math.min(chat.unread, 99)}</Text></View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </CustomerPage>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingTop: 6, paddingBottom: 20 },
  row: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: 1, borderBottomColor: customerColors.border, paddingVertical: 13 },
  pressed: { opacity: 0.68 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: customerColors.border },
  avatarFallback: { width: 58, height: 58, borderRadius: 29, backgroundColor: customerColors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  initial: { color: customerColors.primary, fontSize: 21, fontWeight: '800' },
  onlineDot: { position: 'absolute', right: 1, bottom: 2, width: 13, height: 13, borderRadius: 7, backgroundColor: customerColors.success, borderWidth: 2.5, borderColor: customerColors.background },
  copy: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, color: customerColors.text, fontSize: 15, fontWeight: '600' },
  unreadName: { fontWeight: '800' },
  time: { color: customerColors.muted, fontSize: 11 },
  unreadTime: { color: customerColors.primary, fontWeight: '700' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  preview: { flex: 1, color: customerColors.muted, fontSize: 13 },
  unreadPreview: { color: customerColors.text, fontWeight: '600' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: customerColors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: customerColors.surface, fontSize: 10, fontWeight: '800' },
});
