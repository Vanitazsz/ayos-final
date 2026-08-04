import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import {
  CheckSquare,
  MessageSquare,
  Square,
  Trash2,
} from 'lucide-react-native';
import { EmptyState } from '@/components/layout/EmptyState';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { useConversationListScreenController } from '@/features/messaging/hooks/useConversationListScreenController';

interface ConversationListScreenProps {
  emptyDescription: string;
}

export function ConversationListScreen({
  emptyDescription,
}: ConversationListScreenProps) {
  const {
    chats,
    loading,
    error,
    load,
    selectionMode,
    setSelectionMode,
    confirmingDelete,
    setConfirmingDelete,
    deleting,
    selectedIds,
    deletableIds,
    allSelected,
    exitSelectionMode,
    toggleConversation,
    toggleSelectAll,
    deleteSelected,
    openChat,
  } = useConversationListScreenController();

  return (
    <Screen safeArea>
      <View style={styles.header}>
        <Text style={theme.typography.h2}>Messages</Text>
      </View>
      <ScrollView style={styles.content}>
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
            <View style={styles.sectionHeader}>
              <Text style={[theme.typography.h4, styles.sectionTitle]}>
                Matched Conversations
              </Text>
              {deletableIds.length > 0 && (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.headerAction}
                  disabled={deleting}
                  onPress={() =>
                    selectionMode ? exitSelectionMode() : setSelectionMode(true)
                  }
                >
                  {!selectionMode && (
                    <Trash2 size={16} color={theme.colors.error} />
                  )}
                  <Text
                    style={
                      selectionMode
                        ? styles.cancelText
                        : styles.headerActionText
                    }
                  >
                    {selectionMode ? 'Cancel' : 'Delete Conversation'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {selectionMode && (
              <View style={styles.selectionToolbar}>
                <TouchableOpacity
                  accessibilityRole="checkbox"
                  accessibilityLabel="Select all conversations"
                  accessibilityState={{ checked: allSelected }}
                  style={styles.selectAllButton}
                  onPress={toggleSelectAll}
                >
                  {allSelected ? (
                    <CheckSquare size={20} color={theme.colors.primary} />
                  ) : (
                    <Square size={20} color={theme.colors.textSecondary} />
                  )}
                  <Text style={styles.selectAllText}>
                    {allSelected ? 'Clear All' : 'Select All'}
                  </Text>
                </TouchableOpacity>

                {confirmingDelete ? (
                  <View style={styles.confirmActions}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={deleting}
                      onPress={() => setConfirmingDelete(false)}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.confirmDeleteButton}
                      disabled={deleting}
                      onPress={() => void deleteSelected()}
                    >
                      {deleting && (
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.surface}
                        />
                      )}
                      <Text style={styles.confirmDeleteText}>
                        Confirm Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[
                      styles.deleteSelectedButton,
                      selectedIds.size === 0 && styles.disabledButton,
                    ]}
                    disabled={selectedIds.size === 0}
                    onPress={() => setConfirmingDelete(true)}
                  >
                    <Text
                      style={[
                        styles.deleteSelectedText,
                        selectedIds.size === 0 && styles.disabledText,
                      ]}
                    >
                      Delete Selected ({selectedIds.size})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {chats.map((chat) => {
              const selected = selectedIds.has(chat.id);
              const selectable = Boolean(chat.canArchive);
              return (
                <TouchableOpacity
                  key={chat.id}
                  accessibilityRole={selectionMode ? 'checkbox' : 'button'}
                  accessibilityLabel={
                    selectionMode
                      ? `Select conversation with ${chat.name}`
                      : `Open conversation with ${chat.name}`
                  }
                  accessibilityState={
                    selectionMode
                      ? { checked: selected, disabled: !selectable }
                      : undefined
                  }
                  style={[
                    styles.chatRow,
                    selected && styles.selectedRow,
                    selectionMode && !selectable && styles.disabledRow,
                  ]}
                  onPress={() => {
                    if (selectionMode) {
                      if (selectable) toggleConversation(chat.id);
                      return;
                    }
                    openChat(chat);
                  }}
                >
                  {selectionMode && (
                    <View style={styles.checkbox}>
                      {selected ? (
                        <CheckSquare size={22} color={theme.colors.primary} />
                      ) : (
                        <Square
                          size={22}
                          color={
                            selectable
                              ? theme.colors.textSecondary
                              : theme.colors.border
                          }
                        />
                      )}
                    </View>
                  )}
                  <Image
                    source={chat.avatar}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                  <View style={styles.chatDetails}>
                    <View style={styles.chatHeader}>
                      <Text style={theme.typography.h4}>{chat.name}</Text>
                      <Text
                        style={[
                          theme.typography.caption,
                          {
                            color:
                              chat.unread > 0
                                ? theme.colors.primary
                                : theme.colors.textSecondary,
                          },
                        ]}
                      >
                        {chat.time}
                      </Text>
                    </View>
                    <View style={styles.chatFooter}>
                      <Text
                        style={[
                          theme.typography.body2,
                          {
                            color:
                              chat.unread > 0
                                ? theme.colors.textPrimary
                                : theme.colors.textSecondary,
                            flex: 1,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {chat.lastMessage}
                      </Text>
                      {!chat.canSend && (
                        <Text style={styles.closedLabel}>Read only</Text>
                      )}
                      {chat.unread > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>{chat.unread}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="No Matched Conversations"
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
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.layout.screenPadding,
  },
  listContainer: { marginBottom: theme.spacing.lg },
  sectionHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: { color: theme.colors.primary, flex: 1 },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  headerActionText: { color: theme.colors.error, fontWeight: '600' },
  cancelText: { color: theme.colors.textSecondary, fontWeight: '600' },
  selectionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  selectAllText: { color: theme.colors.textPrimary, fontWeight: '600' },
  deleteSelectedButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.error,
  },
  deleteSelectedText: { color: theme.colors.surface, fontWeight: '700' },
  disabledButton: { backgroundColor: theme.colors.borderLight },
  disabledText: { color: theme.colors.textTertiary },
  confirmActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  confirmDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.error,
  },
  confirmDeleteText: { color: theme.colors.surface, fontWeight: '700' },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  selectedRow: { backgroundColor: theme.colors.infoBackground },
  disabledRow: { opacity: 0.55 },
  checkbox: { marginRight: theme.spacing.sm },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.border,
    marginRight: theme.spacing.md,
  },
  chatDetails: { flex: 1 },
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
  unreadBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  unreadText: {
    color: theme.colors.surface,
    fontSize: 10,
    fontWeight: '700',
  },
  closedLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginLeft: theme.spacing.sm,
  },
  stateContainer: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xxxl,
  },
  stateText: { color: theme.colors.textSecondary },
  errorText: { color: theme.colors.error, textAlign: 'center' },
  retryText: { color: theme.colors.primary, fontWeight: '600' },
});
