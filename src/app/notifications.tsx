import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { useAuthStore } from '@/store/useAuthStore';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { ArrowLeft, Bell, MessageCircle, Calendar, Wrench, MoreVertical, CheckCheck, Filter } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/layout/EmptyState';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { styles } from '@/styles/_notifications.styles';
import { useNotificationsFeed } from '@/hooks/useNotificationsFeed';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const goBack = useGoBack(user?.role === 'WORKER' ? '/(worker)' : '/(tabs)/home');
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);
  const { notifications, filter, setFilter, markRead, markAllRead } = useNotificationsFeed();

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
                      void markRead(notif.id);
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
                          router.push(`/(worker)/booking-request/${notif.payload.booking_id}` as any);
                        } else {
                          router.push(`/booking-summary/${notif.payload.booking_id}` as any);
                        }
                      } else if (notif.payload?.request_id) {
                        if (role === 'WORKER') {
                          router.push('/(worker)/bookings' as any);
                        } else {
                          router.push(
                            `/new-request/matching?requestId=${encodeURIComponent(notif.payload.request_id)}` as any,
                          );
                        }
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
                void markAllRead();
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
