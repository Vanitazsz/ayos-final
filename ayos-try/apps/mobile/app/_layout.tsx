import { Redirect, Stack, usePathname, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { theme } from '@/constants/theme';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { loadCurrentUser } from '@/services/auth';
import { useAuthStore } from '@/store/useAuthStore';

// Prevent auto hide while checking auth state
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const setSessionUser = useAuthStore((state) => state.setSessionUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const sync = async () => {
      try {
        const user = await loadCurrentUser();
        if (mounted) setSessionUser(user);
      } catch {
        if (mounted) setSessionUser(null);
      } finally {
        SplashScreen.hideAsync();
      }
    };
    void sync();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void sync();
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [setLoading, setSessionUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SessionBoundary />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

function SessionBoundary() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const pathname = usePathname();

  const root = segments[0];
  const isPublic =
    root === undefined ||
    root === '(auth)' ||
    root === 'onboarding' ||
    root === 'register-worker' ||
    root === '+not-found';

  if (!isLoading && !isAuthenticated && !isPublic)
    return <Redirect href="/(auth)/login" />;
  if (isAuthenticated && root === '(auth)' && pathname !== '/verify-identity')
    return (
      <Redirect href={user?.role === 'WORKER' ? '/(worker)' : '/(tabs)/home'} />
    );
  if (isAuthenticated && root === 'register-worker' && user?.role !== 'WORKER')
    return <Redirect href="/(tabs)/home" />;
  if (isAuthenticated && user?.role === 'WORKER' && root === '(tabs)')
    return <Redirect href="/(worker)" />;
  if (isAuthenticated && user?.role === 'USER' && root === '(worker)')
    return <Redirect href="/(tabs)/home" />;
  if (isAuthenticated && !user?.profileComplete) {
    if (user?.role === 'WORKER' && root === 'register-worker')
      return (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        />
      );
    if (user?.role === 'WORKER' && pathname !== '/profile')
      return <Redirect href="/(worker)/profile" />;
    if (user?.role === 'USER' && pathname !== '/profile')
      return <Redirect href="/(tabs)/profile" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
