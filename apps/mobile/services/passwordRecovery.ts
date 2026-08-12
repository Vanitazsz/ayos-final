import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export const PASSWORD_RECOVERY_ROUTE = '/auth/reset-password';
export const PASSWORD_RECOVERY_FLOW = 'recovery';
export const PASSWORD_RECOVERY_LOCK_KEY = 'password_recovery_pending';
export const PASSWORD_RECOVERY_ERROR =
  'This password reset link is invalid or has expired. Request a new one.';
export const PASSWORD_RECOVERY_REQUEST_COOLDOWN_MS = 60_000;
export const PASSWORD_RECOVERY_REQUEST_COOLDOWN_ERROR =
  'A reset link was already requested recently. Use the newest email before requesting another one.';
export const PASSWORD_RECOVERY_SUCCESS_TITLE = 'Password changed';
export const PASSWORD_RECOVERY_SUCCESS_MESSAGE =
  'Your password has been changed successfully. Please sign in with your new password.';

export function createPasswordRecoveryRedirect() {
  return Linking.createURL(PASSWORD_RECOVERY_ROUTE, {
    queryParams: { flow: PASSWORD_RECOVERY_FLOW },
  });
}

export function isPasswordRecoveryFlow(value: unknown) {
  return value === PASSWORD_RECOVERY_FLOW;
}

export function shouldStartPasswordRecoveryForRoute(
  isPasswordRecoveryRoute: boolean,
  startedForCurrentRoute: boolean,
) {
  return isPasswordRecoveryRoute && !startedForCurrentRoute;
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

export async function verifyPasswordRecoveryToken(tokenHash: string) {
  const normalizedTokenHash = tokenHash.trim();
  if (!normalizedTokenHash) throw new Error(PASSWORD_RECOVERY_ERROR);

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: normalizedTokenHash,
    type: 'recovery',
  });
  if (error) throw error;
  if (!data.session) throw new Error(PASSWORD_RECOVERY_ERROR);
  return data.session;
}

export async function closePasswordRecoverySession() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
  await clearPasswordRecoveryPending();
}
