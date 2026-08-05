import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { useAuthStore } from '@/store/useAuthStore';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { ArrowLeft, Bell, MessageCircle, Calendar, Wrench, MoreVertical, CheckCheck, Filter } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/layout/EmptyState';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { fetchNotifications, markNotificationRead, subscribeToTable } from '@/services/api';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const goBack = useGoBack(user?.role === 'WORKER' ? '/(worker)' : '/(tabs)/home');
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  useEffect(() => {
    const load = () => void fetchNotifications().then(result => setNotifications(result.data));
    load();
    return subscribeToTable('notifications', load);
  }, []);

  return (
    <Screen safeArea backgroundColor={theme.colors.background}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={[theme.typography.h3, { color: theme.colors.textPrimary }]}>Notifications</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
          <MoreVertical color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[
          styles.contentContainer,
          notifications.length === 0 && { flexGrow: 1, justifyContent: 'center' }
        ]} 
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <EmptyState 
            icon={Bell} 
            title="No Notifications Yet" 
            description="You don't have any notifications at the moment." 
          />
        ) : (
          notifications.filter(n => filter === 'ALL' || n.unread).map((notif, index) => {
            let IconComp = Bell;
            let iconColor: string = theme.colors.primary;
            let iconBg = `${theme.colors.primary}15`;

            const titleLower = notif.title.toLowerCase();
            if (notif.payload?.conversation_id || titleLower.includes('message') || titleLower.includes('chat')) {
              IconComp = MessageCircle;
              iconColor = '#8b5cf6';
              iconBg = '#ede9fe';
            } else if (notif.payload?.booking_id || titleLower.includes('booking')) {
              IconComp = Calendar;
              iconColor = '#f59e0b';
              iconBg = '#fef3c7';
            } else if (notif.payload?.request_id || titleLower.includes('request')) {
              IconComp = Wrench;
              iconColor = '#10b981';
              iconBg = '#d1fae5';
            }

            return (
              <Animated.View key={notif.id} entering={FadeInDown.delay(index * 50).duration(400).springify()}>
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => {
                    if (notif.unread) {
                      void markNotificationRead(notif.id).then(() =>
                        setNotifications(rows => rows.map(row => row.id === notif.id ? { ...row, unread: false } : row))
                      );
                    }
                    
                    const isMessage = titleLower.includes('message') || titleLower.includes('chat');
                    const role = user?.role;

                    if (isMessage) {
                      if (notif.payload?.conversation_id) {
                        router.push(`/messages/chat?conversationId=${notif.payload.conversation_id}` as any);
                      } else if (notif.payload?.booking_id) {
                        router.push(`/messages/chat?id=${notif.payload.booking_id}` as any);
                      } else if (notif.payload?.request_id) {
                        router.push(`/messages/chat?id=${notif.payload.request_id}` as any);
                      } else {
                        router.push(role === 'WORKER' ? '/(worker)/messages' : '/(tabs)/messages' as any);
                      }
                    } else {
                      if (notif.payload?.booking_id) {
                        if (role === 'WORKER') {
                          router.push(`/booking-request/${notif.payload.booking_id}` as any);
                        } else {
                          router.push(`/booking-summary/${notif.payload.booking_id}` as any);
                        }
                      } else if (notif.payload?.request_id) {
                        router.push(`/request/${notif.payload.request_id}` as any);
                      }
                    }
                  }} 
                  style={[styles.notificationCard, notif.unread && styles.unreadCard]}
                >
                  <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                    <IconComp color={iconColor} size={20} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={[theme.typography.body1, { fontWeight: notif.unread ? '700' : '500', color: theme.colors.textPrimary }]}>{notif.title}</Text>
                    <Text style={[theme.typography.body2, { color: theme.colors.textSecondary, marginTop: 4, lineHeight: 20 }]}>{notif.message}</Text>
                    <Text style={[theme.typography.caption, { color: theme.colors.textTertiary, marginTop: 8 }]}>{notif.time}</Text>
                  </View>
                  {notif.unread && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setMenuVisible(false)} activeOpacity={1}>
          <View style={[styles.dropdownMenu, { top: insets.top + 60 }]}>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setMenuVisible(false);
                const unreadNotifs = notifications.filter(n => n.unread);
                if (unreadNotifs.length > 0) {
                  void Promise.all(unreadNotifs.map(n => markNotificationRead(n.id))).then(() => {
                    setNotifications(rows => rows.map(row => ({ ...row, unread: false })));
                  });
                }
              }}
            >
              <CheckCheck color={theme.colors.textPrimary} size={20} style={{ marginRight: 12 }} />
              <Text style={theme.typography.body1}>Mark all as read</Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: theme.colors.borderLight }} />

            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setMenuVisible(false);
                setFilter(prev => prev === 'ALL' ? 'UNREAD' : 'ALL');
              }}
            >
              <Filter color={theme.colors.textPrimary} size={20} style={{ marginRight: 12 }} />
              <Text style={theme.typography.body1}>{filter === 'ALL' ? 'Show unread only' : 'Show all notifications'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.md, paddingHorizontal: theme.layout.screenPadding },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  menuButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: theme.layout.screenPadding, paddingBottom: theme.spacing.xxxl, paddingTop: theme.spacing.md },
  notificationCard: { 
    flexDirection: 'row', 
    backgroundColor: theme.colors.surface, 
    borderRadius: theme.radius.xl, 
    padding: theme.spacing.lg, 
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight
  },
  unreadCard: {
    borderColor: `${theme.colors.primary}40`,
    backgroundColor: '#f8fafc',
  },
  iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  textContainer: { flex: 1, justifyContent: 'center' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary, marginLeft: theme.spacing.sm, alignSelf: 'center' },
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
