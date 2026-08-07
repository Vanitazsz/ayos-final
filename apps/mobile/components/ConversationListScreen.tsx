import React, { useCallback, useEffect, useState, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  MessageSquare,
  Trash2,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmptyState } from '@/components/layout/EmptyState';
import { Screen } from '@/components/layout/Screen';
import { showAlert } from '@/components/AppAlert';
import { theme } from '@/constants/theme';
import { deleteConversations, fetchConversations, subscribeToConversationBroadcast, subscribeToTable } from '@/services/api';
import Animated, { FadeInDown } from 'react-native-reanimated';

const DELETED_CHATS_KEY = 'ayos_deleted_conversation_ids';

interface ConversationListScreenProps {
  emptyDescription: string;
}

export function ConversationListScreen({
  emptyDescription,
}: ConversationListScreenProps) {
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const swipeableRefs = useRef<{ [key: string]: any }>({});

  useEffect(() => {
    AsyncStorage.getItem(DELETED_CHATS_KEY).then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            setDeletedIds(new Set(parsed));
          }
        } catch (e) {}
      }
    });
  }, []);

  const load = useCallback((showLoading = false) => {
    if (showLoading) setLoading(true);
    void fetchConversations('active').then((result) => {
      if (result.error) {
        setError(result.error);
      } else {
        setChats(result.data ?? []);
        setError('');
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load(true);
    const stops = [
      subscribeToTable('messages', () => load(), undefined, undefined, ['INSERT']),
      subscribeToTable('conversations', () => load(), undefined, undefined, ['INSERT', 'UPDATE']),
    ];
    return () => stops.forEach((stop) => stop());
  }, [load]);

  useEffect(() => {
    const stops = chats.map((chat) =>
      subscribeToConversationBroadcast(chat.id, () => load()),
    );
    return () => stops.forEach((stop) => stop());
  }, [chats, load]);

  const handleDelete = (chat: any) => {
    swipeableRefs.current[chat.id]?.close();
    showAlert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            const nextDeleted = new Set(deletedIds);
            nextDeleted.add(chat.id);
            setDeletedIds(nextDeleted);
            await AsyncStorage.setItem(DELETED_CHATS_KEY, JSON.stringify(Array.from(nextDeleted)));
            void deleteConversations([chat.id]);
          } 
        }
      ]
    );
  };

  const renderRightActions = (chat: any) => {
    return (
      <View style={styles.rightActionsContainer}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Delete conversation with ${chat.name}`}
          style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
          onPress={() => handleDelete(chat)}
        >
          <Trash2 color="#fff" size={24} />
        </TouchableOpacity>
      </View>
    );
  };

  const visibleChats = chats.filter((chat) => !deletedIds.has(chat.id));

  return (
    <Screen safeArea backgroundColor={theme.colors.background} style={{ paddingBottom: 0 }} keyboardAvoiding={false}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={[theme.typography.h2, { flex: 1, textAlign: 'center' }]}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView 
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          (loading || error || visibleChats.length === 0) && { flexGrow: 1, justifyContent: 'center' }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.stateText}>Loading conversations…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => load(true)}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : visibleChats.length > 0 ? (
          <View style={styles.listContainer}>
            {visibleChats.map((chat, index) => {
              return (
                <Animated.View key={chat.id} entering={FadeInDown.delay(index * 50).duration(400).springify()} style={{ marginBottom: theme.spacing.sm }}>
                  <Swipeable
                    ref={(ref) => { swipeableRefs.current[chat.id] = ref; }}
                    renderRightActions={() => renderRightActions(chat)}
                    friction={2}
                    overshootRight={false}
                    containerStyle={styles.swipeableContainer}
                  >
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[
                        styles.chatRow,
                        chat.unread > 0 && styles.unreadRow,
                      ]}
                      onPress={() => {
                        router.push(
                          `/messages/chat?${
                            chat.bookingId
                              ? `id=${chat.bookingId}`
                              : `conversationId=${chat.id}`
                          }` as any,
                        );
                      }}
                    >
                      <Image
                        source={chat.avatar}
                        style={styles.avatar}
                        contentFit="cover"
                      />
                      <View style={styles.chatDetails}>
                        <View style={styles.chatHeader}>
                          <Text style={[theme.typography.h4, { color: theme.colors.textPrimary }]}>{chat.name}</Text>
                          <Text
                            style={[
                              theme.typography.body2,
                              {
                                color: chat.unread > 0 ? theme.colors.primary : theme.colors.textSecondary,
                              },
                            ]}
                          >
                            {chat.timestamp ? new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : chat.time}
                          </Text>
                        </View>
                        <View style={styles.chatFooter}>
                          <Text
                            style={[
                              theme.typography.body2,
                              {
                                color: chat.unread > 0 ? theme.colors.textPrimary : theme.colors.textSecondary,
                                flex: 1,
                                fontWeight: chat.unread > 0 ? '600' : '400',
                              },
                            ]}
                            numberOfLines={2}
                          >
                            {chat.lastMessage}
                          </Text>
                          {chat.unread > 0 && (
                            <View style={styles.unreadDot} />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Swipeable>
                </Animated.View>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="No Messages Yet"
            description={emptyDescription}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.layout.screenPadding,
    paddingBottom: 88,
  },
  listContainer: { marginBottom: theme.spacing.lg },
  swipeableContainer: {
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  rightActionsContainer: {
    flexDirection: 'row',
    height: '100%',
  },
  actionButton: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  unreadRow: {
    backgroundColor: '#f8fafc',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.border,
    marginRight: theme.spacing.md,
  },
  chatDetails: { flex: 1, justifyContent: 'center' },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  stateText: { color: theme.colors.textSecondary },
  errorText: { color: theme.colors.error, textAlign: 'center' },
  retryText: { color: theme.colors.primary, fontWeight: '600' },
});
