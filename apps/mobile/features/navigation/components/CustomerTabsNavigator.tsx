import { Animated, Platform, TouchableOpacity } from 'react-native';
import { Tabs } from 'expo-router';
import { FileText, Home, MessageSquare, Plus, User } from 'lucide-react-native';

import { theme } from '@/constants/theme';
import { useCreateTabAnimation } from '../hooks/useCreateTabAnimation';
import { styles } from '../screens/TabsLayoutScreen.styles';

function CreateTabButton() {
  const { handlePressIn, handlePressOut, scale } = useCreateTabAnimation();
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.createButtonContainer}
    >
      <Animated.View style={[styles.createButton, { transform: [{ scale }] }]}>
        <Plus color={theme.colors.surface} size={28} strokeWidth={2.5} />
      </Animated.View>
    </TouchableOpacity>
  );
}

export function CustomerTabsNavigator() {
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
        tabBarItemStyle: { paddingVertical: 0, marginVertical: 0 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 4 },
      }}
    >
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
        options={{ title: '', tabBarButton: () => <CreateTabButton /> }}
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
      <Tabs.Screen name="help-center" options={{ href: null }} />
      <Tabs.Screen name="privacy-policy" options={{ href: null }} />
    </Tabs>
  );
}
