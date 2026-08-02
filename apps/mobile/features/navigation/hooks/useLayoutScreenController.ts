import { supabase, loadCurrentUser } from '../logic/LayoutScreenLogic';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export function useLayoutScreenController() {
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
  return { SafeAreaProvider, QueryClientProvider, StatusBar };
}
