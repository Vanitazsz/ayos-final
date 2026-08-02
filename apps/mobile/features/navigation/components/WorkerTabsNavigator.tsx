import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import {
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  User,
  Wallet,
} from 'lucide-react-native';

import { theme } from '@/constants/theme';
import { WorkerPresenceProvider } from '@/context/WorkerPresenceContext';

export function WorkerTabsNavigator() {
  return (
    <WorkerPresenceProvider enabled>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textTertiary,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopWidth: 0.5,
            borderTopColor: theme.colors.border,
            height: Platform.OS === 'ios' ? 85 : 60,
            paddingBottom: Platform.OS === 'ios' ? 25 : 8,
            paddingTop: 6,
            paddingHorizontal: theme.layout.screenPadding,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
          },
          tabBarItemStyle: { paddingVertical: 0, marginVertical: 0 },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 4 },
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
        {[
          'verification',
          'transactions-history',
          'reviews',
          'settings',
          'service-setup',
          'industry-skills',
          'booking-request/[id]',
          'cancel-service/[id]',
        ].map((name) => (
          <Tabs.Screen key={name} name={name} options={{ href: null }} />
        ))}
      </Tabs>
    </WorkerPresenceProvider>
  );
}
