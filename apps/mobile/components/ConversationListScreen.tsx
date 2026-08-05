import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  MessageSquare,
  BellOff,
  Bell,
  Archive,
  Trash2,
  MoreVertical,
  ArchiveRestore,
  RefreshCcw,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/layout/EmptyState';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { archiveConversations, fetchConversations, unarchiveConversations, subscribeToConversationBroadcast, subscribeToTable, } from '@/services/api';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface ConversationListScreenProps {
  emptyDescription: string;
}

export function ConversationListScreen({
  emptyDescription,
}: ConversationListScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mutedChats, setMutedChats] = useState<Set<string>>(new Set());
  const [menuVisible, setMenuVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const swipeableRefs = useRef<{ [key: string]: any }>({});

  const load = useCallback((showLoading = false) => {
    if (showLoading) setLoading(true);
    void fetchConversations(viewMode).then((result) => {
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
      subscribeToTable('messages', () => load()),
      subscribeToTable('conversations', () => load()),
    ];
    return () => stops.forEach((stop) => stop());
  }, [load, viewMode]);

  useEffect(() => {
    const stops = chats.map((chat) =>
      subscribeToConversationBroadcast(chat.id, () => load()),
    );
    return () => stops.forEach((stop) => stop());
  }, [chats, load]);

  const handleMute = (chatId: string) => {
    setMutedChats((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      return next;
    });
    swipeableRefs.current[chatId]?.close();
  };

  const handleArchive = async (chat: any) => {
    swipeableRefs.current[chat.id]?.close();
    if (!chat.canArchive) {
      Alert.alert('Action Not Allowed', 'You cannot archive an active conversation.');
      return;
    }
    const result = await archiveConversations([chat.id]);
    if (result.failed.length > 0) {
      Alert.alert('Error', 'Failed to archive conversation.');
    }
    load();
  };

  const handleDelete = (chat: any) => {
    swipeableRefs.current[chat.id]?.close();
    if (!chat.canArchive) {
      Alert.alert('Action Not Allowed', 'Active conversations cannot be deleted. Close the booking first.');
      return;
    }
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            const result = await archiveConversations([chat.id]);
            if (result.failed.length > 0) {
              Alert.alert('Error', 'Failed to delete conversation.');
            }
            load();
          } 
        }
      ]
    );
  };

  const handleUnarchive = async (chat: any) => {
    swipeableRefs.current[chat.id]?.close();
    try {
      await unarchiveConversations([chat.id]);
      load();
    } catch (e) {
      Alert.alert('Error', 'Failed to restore conversation.');
    }
  };

  const renderRightActions = (chat: any) => {
    if (viewMode === 'archived') {
      return (
        <View style={styles.rightActionsContainer}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#3b82f6', width: 80 }]} onPress={() => handleUnarchive(chat)}>
            <ArchiveRestore color="#fff" size={24} />
          </TouchableOpacity>
        </View>
      );
    }
    
    const isMuted = mutedChats.has(chat.id);
    return (
      <View style={styles.rightActionsContainer}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#8b5cf6' }]} onPress={() => handleMute(chat.id)}>
          {isMuted ? <Bell color="#fff" size={24} /> : <BellOff color="#fff" size={24} />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#3b82f6', opacity: chat.canArchive ? 1 : 0.5 }]} onPress={() => handleArchive(chat)}>
          <Archive color="#fff" size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.error, opacity: chat.canArchive ? 1 : 0.5 }]} onPress={() => handleDelete(chat)}>
          <Trash2 color="#fff" size={24} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Screen safeArea backgroundColor={theme.colors.background}>
      <View style={styles.header}>
        {viewMode === 'archived' ? (
          <>
            <TouchableOpacity onPress={() => setViewMode('active')} style={{ width: 40, justifyContent: 'center', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 24, color: theme.colors.textPrimary }}>←</Text>
            </TouchableOpacity>
            <Text style={[theme.typography.h2, { flex: 1, textAlign: 'center' }]}>Archived</Text>
            <View style={{ width: 40 }} />
          </>
        ) : (
          <>
            <View style={{ width: 40 }} />
            <Text style={[theme.typography.h2, { flex: 1, textAlign: 'center' }]}>Messages</Text>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
              <MoreVertical color={theme.colors.textPrimary} size={24} />
            </TouchableOpacity>
          </>
        )}
      </View>
      <ScrollView 
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          (loading || error || chats.length === 0) && { flexGrow: 1, justifyContent: 'center' }
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
        ) : chats.length > 0 ? (
          <View style={styles.listContainer}>
            {chats.map((chat, index) => {
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
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {mutedChats.has(chat.id) && <BellOff size={16} color={theme.colors.textTertiary} />}
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

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setMenuVisible(false)} activeOpacity={1}>
          <View style={[styles.dropdownMenu, { top: insets.top + 60 }]}>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setMenuVisible(false);
                setViewMode('archived');
              }}
            >
              <ArchiveRestore color={theme.colors.textPrimary} size={20} style={{ marginRight: 12 }} />
              <Text style={theme.typography.body1}>Unarchive Messages</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.layout.screenPadding,
    paddingBottom: theme.spacing.xxxl,
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
  dropdownMenu: { 
    position: 'absolute', 
    right: theme.layout.screenPadding, 
    backgroundColor: theme.colors.surface, 
    borderRadius: theme.radius.lg, 
    ...theme.shadows.md,
    minWidth: 220,
    borderWidth: 1,
    borderColor: theme.colors.borderLight
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
  }
});
