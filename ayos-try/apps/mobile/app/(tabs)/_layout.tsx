import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Home, FileText, MessageSquare, User, Plus } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';

const CreateButton = () => {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
    router.push('/new-request/create');
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.createButtonContainer}
    >
      <Animated.View style={[styles.createButton, { transform: [{ scale: scaleAnim }] }]}>
        <Plus color={theme.colors.surface} size={28} strokeWidth={2.5} />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function TabLayout() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  if (!isLoading && !isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!isLoading && user?.role !== 'USER') return <Redirect href="/(worker)" />;
  return (
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
        tabBarItemStyle: {
          paddingVertical: 0,
          marginVertical: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}>
      
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <FileText size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarButton: () => <CreateButton />,
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
      
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createButtonContainer: {
    top: -12,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  createButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0B63D6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0B63D6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
});
