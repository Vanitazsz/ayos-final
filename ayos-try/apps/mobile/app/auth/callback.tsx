import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import { loadCurrentUser, signInWithGoogle } from '@/services/auth';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

type CallbackState = { status: 'loading' } | { status: 'error'; message: string };

function parameter(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const setSessionUser = useAuthStore((state) => state.setSessionUser);
  const [state, setState] = useState<CallbackState>({ status: 'loading' });
  const [retrying, setRetrying] = useState(false);
  const callbackCode = useMemo(() => parameter(params.code), [params.code]);

  useEffect(() => {
    let cancelled = false;
    const finish = async () => {
      try {
        const providerError = parameter(params.error_description) || parameter(params.error);
        if (providerError) throw new Error(providerError);

        let { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session && callbackCode) {
          const exchange = await supabase.auth.exchangeCodeForSession(callbackCode);
          if (exchange.error) throw exchange.error;
          sessionData = { session: exchange.data.session };
        }
        if (!sessionData.session) throw new Error('No Google session was returned. Please try again.');

        try {
          const user = await loadCurrentUser();
          if (!user) throw new Error('Your Google session has expired. Please sign in again.');
          if (cancelled) return;
          setSessionUser(user);
          router.replace(user.role === 'WORKER' ? '/(worker)' : '/(tabs)/home');
        } catch (profileError) {
          // Incomplete real accounts go to their role-specific profile setup.
          if (!(profileError instanceof Error) || !profileError.message.toLowerCase().includes('profile')) throw profileError;
          const { data, error } = await supabase.rpc('get_my_profile');
          const account = data?.account;
          if (error || !account || !['USER', 'WORKER'].includes(account.role)) throw profileError;
          if (cancelled) return;
          setSessionUser({ id: account.id, email: account.email, phone: account.mobile ?? '', name: '', role: account.role, emailVerified: Boolean(data.email_verified), profileComplete: false });
          router.replace(account.role === 'WORKER' ? '/(worker)/profile' : '/(tabs)/profile');
        }
      } catch (error) {
        if (!cancelled) setState({ status: 'error', message: error instanceof Error ? error.message : 'Google sign-in could not be completed.' });
      }
    };
    void finish();
    return () => { cancelled = true; };
  }, [callbackCode, params.error, params.error_description, router, setSessionUser]);

  const retry = async () => {
    setRetrying(true);
    try { await signInWithGoogle(); } catch (error) { setState({ status: 'error', message: error instanceof Error ? error.message : 'Google sign-in could not be completed.' }); setRetrying(false); }
  };

  return (
    <Screen safeArea backgroundColor={theme.colors.background}>
      <View style={styles.container}>
        {state.status === 'loading' ? <ActivityIndicator size="large" color={theme.colors.primary} /> : <AlertCircle size={32} color={theme.colors.error} />}
        <Text style={styles.title}>{state.status === 'loading' ? 'Signing you in…' : 'Google sign-in could not be completed'}</Text>
        {state.status === 'error' ? <Text style={styles.message}>{state.message}</Text> : <Text style={styles.message}>Checking your Supabase account and profile.</Text>}
        {state.status === 'error' ? <View style={styles.actions}><Button title="Try Google sign-in again" icon={RefreshCw} loading={retrying} onPress={retry} fullWidth /><Button title="Back to sign in" icon={ArrowLeft} variant="ghost" onPress={() => router.replace('/(auth)/login')} fullWidth /></View> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  title: { ...theme.typography.h3, color: theme.colors.textPrimary, textAlign: 'center', marginTop: theme.spacing.lg },
  message: { ...theme.typography.body2, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.sm, maxWidth: 420 },
  actions: { width: '100%', maxWidth: 360, gap: theme.spacing.sm, marginTop: theme.spacing.xl },
});
