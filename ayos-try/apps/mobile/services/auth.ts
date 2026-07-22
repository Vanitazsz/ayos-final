import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { normalizePhilippinePhone } from '@/lib/workerRegistration';

WebBrowser.maybeCompleteAuthSession();

function extractRawErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
    if (typeof e.error_description === 'string') return e.error_description;
    if (typeof e.msg === 'string') return e.msg;
  }
  return '';
}

function friendlyAuthError(raw: string): string {
  const l = raw.toLowerCase();
  if (
    l.includes('invalid login credentials') ||
    l.includes('invalid email or password') ||
    l.includes('wrong password') ||
    l.includes('user not found')
  )
    return 'Invalid email or password. Please try again.';
  if (l.includes('email not confirmed'))
    return 'Please verify your email address before signing in.';
  if (l.includes('too many') || l.includes('rate limit'))
    return 'Too many login attempts. Please wait a moment and try again.';
  if (l.includes('network') || l.includes('fetch') || l.includes('timeout'))
    return 'Unable to connect. Check your internet connection and try again.';
  if (l.includes('signup disabled'))
    return 'Account registration is currently disabled.';
  if (l.includes('account not found') || l.includes('ACCOUNT_NOT_FOUND'))
    return 'No account found with this email address.';
  if (l.includes('profile setup'))
    return 'Your account needs setup. Please complete your profile first.';
  if (l.includes('suspended'))
    return 'This account has been suspended. Please contact support.';
  return raw || 'Unable to sign in. Please try again.';
}

export async function signInWithPassword(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
    throw new Error('Enter a valid email address');
  if (!password) throw new Error('Password is required');

  let authResult;
  try {
    authResult = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
  } catch (fetchError) {
    console.error('[auth] signInWithPassword network error:', fetchError);
    throw new Error(
      'Unable to connect. Check your internet connection and try again.',
    );
  }

  if (authResult.error) {
    console.error('[auth] signInWithPassword error:', authResult.error);
    const raw = extractRawErrorMessage(authResult.error);
    throw new Error(friendlyAuthError(raw));
  }
  if (!authResult.data.session)
    throw new Error('Supabase did not return an authenticated session');

  try {
    const user = await loadCurrentUser();
    try {
      await supabase.functions.invoke('record-auth-session', { body: {} });
    } catch (sessionLogErr) {
      console.warn('[auth] record-auth-session failed (non-fatal):', sessionLogErr);
    }
    return user;
  } catch (profileError) {
    console.error('[auth] loadCurrentUser failed after login:', profileError);
    await supabase.auth.signOut({ scope: 'local' });
    throw profileError;
  }
}

export async function signUpCustomer(input: {
  email: string;
  password: string;
  name: string;
  mobile: string;
}) {
  const mobile = normalizePhilippinePhone(input.mobile);
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: { role: 'USER', name: input.name.trim(), mobile },
      emailRedirectTo: Linking.createURL('/auth/callback'),
    },
  });
  if (error) throw error;
  return data;
}

export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token,
    type: 'signup',
  });
  if (error) throw error;
  return data;
}

export async function resendEmailOtp(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: Linking.createURL('/auth/callback') },
  });
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: Linking.createURL('/auth/callback') },
  );
  if (error) throw error;
}

export async function signInWithGoogle() {
  const redirectTo = Linking.createURL('/auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
  });
  if (error) throw error;
  if (Platform.OS === 'web') return;
  if (!data.url) throw new Error('Google authorization URL was not returned');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss')
    throw new Error('Google sign-in was cancelled');
  if (result.type !== 'success') throw new Error('Google sign-in failed');
  const parsed = Linking.parse(result.url);
  const code =
    typeof parsed.queryParams?.code === 'string'
      ? parsed.queryParams.code
      : null;
  if (!code)
    throw new Error('OAuth callback did not contain an authorization code');
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  await supabase.functions.invoke('record-auth-session', { body: {} });
}

export async function loadCurrentUser() {
  const [{ data: sessionData }, { data: userData, error: userError }] =
    await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()]);
  const session = sessionData.session;
  if (!session) return null;
  if (userError || !userData.user || userData.user.id !== session.user.id) {
    throw userError
      ? new Error(friendlyAuthError(extractRawErrorMessage(userError)))
      : new Error('Session expired. Please sign in again.');
  }

  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) {
    console.error('[auth] get_my_profile RPC error:', error);
    const raw = extractRawErrorMessage(error);
    if (raw.includes('ACCOUNT_NOT_FOUND'))
      throw new Error('No account found. Please register first.');
    if (raw.includes('AUTHENTICATION_REQUIRED'))
      throw new Error('Session expired. Please sign in again.');
    throw new Error(friendlyAuthError(raw));
  }

  const account = data?.account;
  const profile = data?.profile;
  if (
    !account ||
    !profile ||
    typeof profile.display_name !== 'string' ||
    !profile.display_name.trim()
  )
    throw new Error(
      'Your account profile is incomplete. Please complete your profile to continue.',
    );
  if (account.id !== userData.user.id)
    throw new Error(
      'Account profile mismatch. Please sign in again.',
    );
  if (account.status !== 'ACTIVE') {
    await supabase.auth.signOut();
    if (account.status === 'SUSPENDED')
      throw new Error(
        'This account has been suspended. Please contact support.',
      );
    throw new Error('This account is currently unavailable.');
  }
  if (!['USER', 'WORKER'].includes(account.role)) {
    await supabase.auth.signOut({ scope: 'local' });
    throw new Error(
      'This account cannot use the mobile app. Please use the web portal instead.',
    );
  }
  if (data.active_role !== account.role)
    throw new Error('Session role mismatch. Please sign in again.');
  return {
    id: account.id,
    email: account.email,
    phone: account.mobile ?? '',
    name: profile.display_name.trim(),
    role: account.role,
    emailVerified: Boolean(data.email_verified),
    profileComplete: Boolean(data.profile_complete),
  };
}
