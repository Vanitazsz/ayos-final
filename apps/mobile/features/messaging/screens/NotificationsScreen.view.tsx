import { styles } from './NotificationsScreen.styles';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { EmptyState } from '@/components/layout/EmptyState';
import type { useNotificationsScreenController } from '../hooks/useNotificationsScreenController';

export function NotificationsView({
  model,
}: {
  model: ReturnType<typeof useNotificationsScreenController>;
}) {
  const { router, notifications, setNotifications, markNotificationRead } =
    model;
  return (
    <Screen safeArea>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text
          style={[theme.typography.h4, { color: theme.colors.textPrimary }]}
        >
          Notifications
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No Notifications Yet"
            description="You don't have any notifications at the moment."
          />
        ) : (
          notifications.map((notif, index) => (
            <TouchableOpacity
              onPress={() => {
                if (notif.unread) {
                  void markNotificationRead(notif.id).then(() =>
                    setNotifications((rows) =>
                      rows.map((row) =>
                        row.id === notif.id ? { ...row, unread: false } : row,
                      ),
                    ),
                  );
                }
                if (notif.payload?.conversation_id) {
                  router.push(
                    `/messages/chat?conversationId=${notif.payload.conversation_id}` as any,
                  );
                }
              }}
              key={notif.id}
              style={[
                styles.notificationCard,
                index !== notifications.length - 1 && styles.borderBottom,
                notif.unread && styles.unreadBackground,
              ]}
            >
              <View style={styles.iconContainer}>
                <Bell color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.textContainer}>
                <Text
                  style={[
                    theme.typography.body1,
                    { fontWeight: notif.unread ? '700' : '500' },
                  ]}
                >
                  {notif.title}
                </Text>
                <Text
                  style={[
                    theme.typography.body2,
                    { color: theme.colors.textSecondary, marginTop: 4 },
                  ]}
                >
                  {notif.message}
                </Text>
                <Text
                  style={[
                    theme.typography.caption,
                    { color: theme.colors.textTertiary, marginTop: 8 },
                  ]}
                >
                  {notif.time}
                </Text>
              </View>
              {notif.unread && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
