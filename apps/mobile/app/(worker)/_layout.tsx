import React, { useEffect, useState } from 'react';
import { View, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import {
  LayoutDashboard,
  CalendarDays,
  User,
  Wallet,
  MessageSquare,
  Briefcase,
  AlertCircle,
  MapPin,
  Pause,
  Wifi,
  WifiOff,
  MapPinOff,
  TriangleAlert,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useWorkerBookingStore } from '@/store/useWorkerBookingStore';
import { useWorkerPresence } from '@/context/WorkerPresenceContext';
import type { PresenceState } from '@/services/liveDispatch';
import type { LucideIcon } from 'lucide-react-native';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 60;

type PresenceBannerConfig = {
  bg: string;
  icon: LucideIcon;
  text: string;
};

const PRESENCE_BANNER: Record<string, PresenceBannerConfig> = {
  working: {
    bg: theme.colors.warning,
    icon: Briefcase,
    text: 'You are currently working on a job — Tap to view',
  },
  online: {
    bg: theme.colors.success,
    icon: Wifi,
    text: 'Online and receiving requests',
  },
  starting: {
    bg: theme.colors.info,
    icon: MapPin,
    text: 'Starting location sharing…',
  },
  paused: {
    bg: theme.colors.warning,
    icon: Pause,
    text: 'Presence paused',
  },
  offline: {
    bg: theme.colors.textSecondary,
    icon: WifiOff,
    text: 'Offline',
  },
  permission_denied: {
    bg: theme.colors.error,
    icon: MapPinOff,
    text: 'Location permission required',
  },
  not_ready: {
    bg: theme.colors.warning,
    icon: AlertCircle,
    text: 'Complete Service Availability and switch Available for matching on.',
  },
  error: {
    bg: theme.colors.error,
    icon: TriangleAlert,
    text: 'Location heartbeat error',
  },
};

const PRESENCE_TEXT_FALLBACK: Record<PresenceState, string> = {
  starting: 'Starting location sharing…',
  online: 'Online and receiving requests',
  paused: 'Presence paused',
  offline: 'Offline',
  permission_denied: 'Location permission required',
  not_ready:
    'Complete Service Availability and switch Available for matching on.',
  error: 'Location heartbeat error',
};

export default function WorkerTabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const isCurrentlyWorking = useWorkerBookingStore((s) => s.isCurrentlyWorking);
  const currentBookingId = useWorkerBookingStore((s) => s.currentBookingId);
  const {
    state: presenceState,
    message: presenceMessage,
    ready,
  } = useWorkerPresence();
  const [startingDismissed, setStartingDismissed] = useState(false);
  useEffect(() => {
    if (pathname !== '/bookings' || presenceState !== 'starting' || !ready) {
      setStartingDismissed(false);
      return;
    }
    const timer = setTimeout(() => setStartingDismissed(true), 5000);
    return () => clearTimeout(timer);
  }, [pathname, presenceState, ready]);

  if (!isLoading && !isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!isLoading && user?.role !== 'WORKER')
    return <Redirect href="/(tabs)/home" />;
  if (isLoading || !isAuthenticated || user?.role !== 'WORKER') return null;

  const showWorking = isCurrentlyWorking && currentBookingId;
  const config = showWorking
    ? PRESENCE_BANNER.working
    : pathname === '/bookings' && ready
      ? PRESENCE_BANNER[presenceState]
      : null;
  const startingHidden =
    config === PRESENCE_BANNER.starting && startingDismissed;
  const bannerText = config
    ? config === PRESENCE_BANNER.working
      ? config.text
      : presenceMessage || config.text
    : '';
  const Icon = config?.icon;

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textTertiary,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopWidth: 0.5,
            borderTopColor: theme.colors.border,
            height: TAB_BAR_HEIGHT,
            paddingBottom: Platform.OS === 'ios' ? 25 : 8,
            paddingTop: 6,
            paddingHorizontal: theme.layout.screenPadding,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
          },
          tabBarItemStyle: {
            paddingVertical: 0,
            marginVertical: 0,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => (
              <LayoutDashboard size={24} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Bookings',
            tabBarIcon: ({ color }) => (
              <CalendarDays size={24} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color }) => (
              <MessageSquare size={24} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: 'Wallet',
            tabBarIcon: ({ color }) => (
              <Wallet size={24} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <User size={24} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen name="verification" options={{ href: null }} />
        <Tabs.Screen name="transactions-history" options={{ href: null }} />
        <Tabs.Screen name="reviews" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="personal-info" options={{ href: null }} />
        <Tabs.Screen name="service-setup" options={{ href: null }} />
        <Tabs.Screen name="industry-skills" options={{ href: null }} />
        <Tabs.Screen name="booking-request/[id]" options={{ href: null }} />
        <Tabs.Screen name="cancel-service/[id]" options={{ href: null }} />
        <Tabs.Screen name="leave-feedback/[id]" options={{ href: null }} />
      </Tabs>

      {config && Icon && !startingHidden ? (
        <Pressable
          style={[styles.banner, { backgroundColor: config.bg }]}
          onPress={() => {
            if (showWorking && currentBookingId)
              router.push(`/(worker)/booking-request/${currentBookingId}`);
            else if (config === PRESENCE_BANNER.not_ready)
              router.push('/(worker)/service-setup');
          }}
        >
          <View style={styles.bannerDotContainer}>
            <View style={styles.bannerDot} />
          </View>
          <Icon size={16} color={theme.colors.surface} />
          <Text style={styles.bannerText}>{bannerText}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT,
    left: 0,
    right: 0,
    paddingHorizontal: theme.layout.screenPadding,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    elevation: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bannerDotContainer: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surface,
  },
  bannerText: {
    flex: 1,
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
});
