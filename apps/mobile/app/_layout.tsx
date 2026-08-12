import {
  Redirect,
  Stack,
  usePathname,
  useSegments,
  type Href,
} from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { theme } from '@/constants/theme';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { loadCurrentUser } from '@/services/auth';
import {
  hasPendingPasswordRecovery,
  markPasswordRecoveryPending,
  PASSWORD_RECOVERY_ROUTE,
} from '@/services/passwordRecovery';
import { useAuthStore } from '@/store/useAuthStore';
import { WorkerPresenceProvider } from '@/context/WorkerPresenceContext';
import { AppAlertHost } from '@/components/AppAlert';

// Prevent auto hide while checking auth state
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

if (typeof globalThis !== 'undefined' && (globalThis as any).ErrorUtils) {
  const prev = (globalThis as any).ErrorUtils.getGlobalHandler?.() ?? null;
  (globalThis as any).ErrorUtils.setGlobalHandler(
    (error: any, isFatal?: boolean) => {
      if (
        error?.message?.includes('Load failed') ||
        error?.message?.includes('Network request failed')
      ) {
        console.warn('[global] suppressed network error:', error.message);
        return;
      }
      if (prev) prev(error, isFatal);
    },
  );
}

export default function RootLayout() {
  const [authBootstrapReady, setAuthBootstrapReady] = useState(false);
  const setSessionUser = useAuthStore((state) => state.setSessionUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const startPasswordRecovery = useAuthStore(
    (state) => state.startPasswordRecovery,
  );
  const { user, isAuthenticated, isPasswordRecovery } = useAuthStore();
  const pathname = usePathname();
  const isPasswordRecoveryRoute = pathname === PASSWORD_RECOVERY_ROUTE;
  const isAuthTransitionRoute =
    isPasswordRecoveryRoute || pathname === '/auth/callback';

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    if (isPasswordRecoveryRoute) startPasswordRecovery();

    const sync = async () => {
      if (isAuthTransitionRoute || isPasswordRecovery) {
        if (mounted) {
          setSessionUser(null);
          setAuthBootstrapReady(true);
        }
        await SplashScreen.hideAsync();
        return;
      }
      let pendingRecovery = false;
      try {
        pendingRecovery = await hasPendingPasswordRecovery();
      } catch (error) {
        console.error('[auth] Could not verify password recovery lock:', error);
        if (mounted) {
          setSessionUser(null);
          setAuthBootstrapReady(true);
        }
        await SplashScreen.hideAsync();
        return;
      }
      if (pendingRecovery) {
        if (mounted) {
          startPasswordRecovery();
          setSessionUser(null);
          setAuthBootstrapReady(true);
        }
        await SplashScreen.hideAsync();
        return;
      }
      try {
        const user = await loadCurrentUser();
        if (mounted) {
          setSessionUser(user);
          setAuthBootstrapReady(true);
        }
      } catch {
        if (mounted) {
          setSessionUser(null);
          setAuthBootstrapReady(true);
        }
      } finally {
        await SplashScreen.hideAsync();
      }
    };
    void sync();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        void markPasswordRecoveryPending().finally(() => {
          if (mounted) {
            startPasswordRecovery();
            setSessionUser(null);
          }
        });
        return;
      }
      if (isAuthTransitionRoute || isPasswordRecovery) {
        if (mounted) setSessionUser(null);
        return;
      }
      if (
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'USER_UPDATED' ||
        event === 'TOKEN_REFRESHED'
      ) {
        void sync();
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [
    isAuthTransitionRoute,
    isPasswordRecovery,
    isPasswordRecoveryRoute,
    setLoading,
    setSessionUser,
    startPasswordRecovery,
  ]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <WorkerPresenceProvider
            enabled={isAuthenticated && user?.role === 'WORKER'}
          >
            <SessionBoundary authBootstrapReady={authBootstrapReady} />
            <AppAlertHost />
          </WorkerPresenceProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function SessionBoundary({ authBootstrapReady }: { authBootstrapReady: boolean }) {
  const { user, isAuthenticated, isLoading, isPasswordRecovery } =
    useAuthStore();
  const segments = useSegments();
  const pathname = usePathname();

  const root = segments[0];
  const isPublic =
    root === undefined ||
    root === '(auth)' ||
    root === 'auth' ||
    root === 'onboarding' ||
    root === 'register-worker' ||
    root === '+not-found';

  if (!authBootstrapReady) return null;
  if (isPasswordRecovery && pathname !== PASSWORD_RECOVERY_ROUTE)
    return (
      <Redirect href={'/auth/reset-password?flow=recovery' as Href} />
    );
  if (!isLoading && !isAuthenticated && !isPublic)
    return <Redirect href="/(auth)/login" />;
  if (
    isAuthenticated &&
    root === '(auth)' &&
    pathname !== '/verify-identity' &&
    pathname !== '/otp'
  )
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
    if (user?.role === 'WORKER' && root === 'register-worker') {
      // Allow register-worker page to render normally
    } else if (user?.role === 'WORKER' && root !== '(worker)' && !pathname.includes('profile')) {
      return <Redirect href="/(worker)/profile" />;
    } else if (user?.role === 'USER' && root !== '(tabs)' && !pathname.includes('profile')) {
      return <Redirect href="/(tabs)/profile" />;
    }
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
      <Stack.Screen name="(worker)" />
      <Stack.Screen name="register-worker" />
    </Stack>
  );
}
