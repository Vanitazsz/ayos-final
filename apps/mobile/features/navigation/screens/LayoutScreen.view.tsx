import { ErrorBoundary } from '@/components/ErrorBoundary';
import { theme } from '@/constants/theme';
import { QueryClient } from '@tanstack/react-query';
import { Redirect, Stack, usePathname, useSegments } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import type { useLayoutScreenController } from '../hooks/useLayoutScreenController';
const queryClient = new QueryClient();

function SessionBoundary() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
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
export function RootLayoutView({
  model,
}: {
  model: ReturnType<typeof useLayoutScreenController>;
}) {
  const { SafeAreaProvider, QueryClientProvider, StatusBar } = model;
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <ErrorBoundary>
          <SessionBoundary />
        </ErrorBoundary>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
