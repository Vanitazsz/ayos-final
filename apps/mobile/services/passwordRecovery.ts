import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export const PASSWORD_RECOVERY_ROUTE = '/auth/reset-password';
export const PASSWORD_RECOVERY_FLOW = 'recovery';
export const PASSWORD_RECOVERY_LOCK_KEY = 'password_recovery_pending';
export const PASSWORD_RECOVERY_ERROR =
  'This password reset link is invalid or has expired. Request a new one.';

export function createPasswordRecoveryRedirect() {
  return Linking.createURL(PASSWORD_RECOVERY_ROUTE, {
    queryParams: { flow: PASSWORD_RECOVERY_FLOW },
  });
}

export function isPasswordRecoveryFlow(value: unknown) {
  return value === PASSWORD_RECOVERY_FLOW;
}

export async function markPasswordRecoveryPending() {
  await AsyncStorage.setItem(PASSWORD_RECOVERY_LOCK_KEY, 'true');
}

export async function hasPendingPasswordRecovery() {
  return (
    (await AsyncStorage.getItem(PASSWORD_RECOVERY_LOCK_KEY)) === 'true'
  );
}

export async function clearPasswordRecoveryPending() {
  await AsyncStorage.removeItem(PASSWORD_RECOVERY_LOCK_KEY);
}

export async function loadPasswordRecoverySession(code?: string) {
  let { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  if (!sessionData.session && code) {
    const exchange = await supabase.auth.exchangeCodeForSession(code);
    if (exchange.error) throw exchange.error;
    sessionData = { session: exchange.data.session };
  }

  if (!sessionData.session) throw new Error(PASSWORD_RECOVERY_ERROR);
  return sessionData.session;
}

export async function closePasswordRecoverySession() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
  await clearPasswordRecoveryPending();
}
