import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { EmptyState } from '@/components/layout/EmptyState';
import { MessageSquare } from 'lucide-react-native';
import { Image } from 'expo-image';
import {
  fetchConversations,
  subscribeToConversationBroadcast,
  subscribeToTable,
} from '@/services/api';

export default function WorkerMessagesScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const load = useCallback(() => {
    void fetchConversations().then((result) => setChats(result.data ?? []));
  }, []);

  useEffect(() => {
    load();
    const stops = [
      subscribeToTable('messages', load),
      subscribeToTable('conversations', load),
    ];
    return () => stops.forEach((stop) => stop());
  }, [load]);

  useEffect(() => {
    const stops = chats.map((chat) =>
      subscribeToConversationBroadcast(chat.id, load),
    );
    return () => stops.forEach((stop) => stop());
  }, [chats, load]);

  return (
    <Screen safeArea>
      <View style={styles.header}>
        <Text style={theme.typography.h2}>Messages</Text>
      </View>
      <ScrollView style={styles.content}>
        {chats.length > 0 ? (
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Text style={[theme.typography.h4, { marginBottom: theme.spacing.sm, color: theme.colors.primary }]}>Matched Conversations</Text>
            {chats.map(chat => (
              <TouchableOpacity
                key={chat.id}
                style={styles.chatRow}
                onPress={() => router.push(`/messages/chat?${chat.bookingId ? `id=${chat.bookingId}` : `conversationId=${chat.id}`}` as any)}
              >
                <Image source={chat.avatar} style={styles.avatar} contentFit="cover" />
                <View style={styles.chatDetails}>
                  <View style={styles.chatHeader}>
                    <Text style={theme.typography.h4}>{chat.name}</Text>
                    <Text style={[theme.typography.caption, { color: chat.unread > 0 ? theme.colors.primary : theme.colors.textSecondary }]}>
                      {chat.time}
                    </Text>
                  </View>
                  <View style={styles.chatFooter}>
                    <Text
                      style={[theme.typography.body2, { color: chat.unread > 0 ? theme.colors.textPrimary : theme.colors.textSecondary, flex: 1 }]}
                      numberOfLines={1}
                    >
                      {chat.lastMessage}
                    </Text>
                    {!chat.canSend && (
                      <Text style={styles.closedLabel}>Read only</Text>
                    )}
                    {chat.unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={{ color: theme.colors.surface, fontSize: 10, fontWeight: '700' }}>{chat.unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="No Matched Conversations"
            description="Messages become available after you match with a customer."
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: theme.spacing.md, paddingHorizontal: theme.layout.screenPadding },
  content: { flex: 1, paddingHorizontal: theme.layout.screenPadding },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.border, marginRight: theme.spacing.md },
  chatDetails: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  unreadBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: theme.spacing.sm },
  closedLabel: { color: theme.colors.textSecondary, fontSize: 11, marginLeft: theme.spacing.sm },
});
