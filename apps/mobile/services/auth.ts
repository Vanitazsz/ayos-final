import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { normalizePhilippinePhone, signupErrorMessage } from '@/lib/workerRegistration';
import { verifyEmailDeliverability } from '@/lib/emailVerification';
import { invokeAuthenticatedFunction } from '@/services/authenticatedFunctions';
import { invalidateUserCache } from '@/services/apiCore';
import {
  createPasswordRecoveryRedirect,
  PASSWORD_RECOVERY_REQUEST_COOLDOWN_ERROR,
  PASSWORD_RECOVERY_REQUEST_COOLDOWN_MS,
} from '@/services/passwordRecovery';

WebBrowser.maybeCompleteAuthSession();

const passwordRecoveryRequests = new Map<string, Promise<void>>();
const passwordRecoveryCooldowns = new Map<string, number>();

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

  invalidateUserCache();
  try {
    const user = await loadCurrentUser();
    try {
      await invokeAuthenticatedFunction('record-auth-session', { body: {} });
    } catch (sessionLogErr) {
      console.warn(
        '[auth] record-auth-session failed (non-fatal):',
        sessionLogErr,
      );
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
  const verifiedEmail = await verifyEmailDeliverability(input.email);
  const mobile = normalizePhilippinePhone(input.mobile);

  // Check if email or mobile is already registered
  try {
    const { data: existing } = await supabase
      .from('accounts')
      .select('email, mobile')
      .or(`email.eq.${verifiedEmail.trim().toLowerCase()},mobile.eq.${mobile}`)
      .maybeSingle();

    if (existing) {
      if (existing.email?.toLowerCase() === verifiedEmail.trim().toLowerCase()) {
        throw new Error(`An account already exists for ${verifiedEmail.trim().toLowerCase()}. Please sign in instead.`);
      }
      if (existing.mobile === mobile) {
        throw new Error(`This mobile number (${input.mobile}) is already registered. Sign in or use a different number.`);
      }
    }
  } catch (checkErr: any) {
    if (checkErr instanceof Error && checkErr.message.includes('already')) {
      throw checkErr;
    }
  }

  let authResult;
  try {
    authResult = await supabase.auth.signUp({
      email: verifiedEmail.trim().toLowerCase(),
      password: input.password,
      options: {
        data: { role: 'USER', name: input.name.trim(), mobile },
        emailRedirectTo: Linking.createURL('/auth/callback'),
      },
    });
  } catch (fetchError: any) {
    console.error('[auth] signUpCustomer network error:', fetchError);
    if (fetchError instanceof Error && fetchError.message) {
      throw fetchError;
    }
    throw new Error(
      'Unable to connect. Check your internet connection and try again.',
    );
  }
  if (authResult.error) {
    console.error('[auth] signUpCustomer error:', authResult.error);
    throw new Error(signupErrorMessage(authResult.error));
  }
  if (authResult.data.user?.identities?.length === 0) {
    throw new Error(
      'An account with this email already exists. Sign in to continue.',
    );
  }
  return authResult.data;
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

export function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const inFlightRequest = passwordRecoveryRequests.get(normalizedEmail);
  if (inFlightRequest) return inFlightRequest;

  const cooldownUntil = passwordRecoveryCooldowns.get(normalizedEmail) ?? 0;
  if (cooldownUntil > Date.now()) {
    return Promise.reject(new Error(PASSWORD_RECOVERY_REQUEST_COOLDOWN_ERROR));
  }

  const request = (async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo: createPasswordRecoveryRedirect() },
    );
    if (error) throw error;
    passwordRecoveryCooldowns.set(
      normalizedEmail,
      Date.now() + PASSWORD_RECOVERY_REQUEST_COOLDOWN_MS,
    );
  })();

  passwordRecoveryRequests.set(normalizedEmail, request);
  const clearInFlightRequest = () => {
    if (passwordRecoveryRequests.get(normalizedEmail) === request) {
      passwordRecoveryRequests.delete(normalizedEmail);
    }
  };
  void request.then(clearInFlightRequest, clearInFlightRequest);
  return request;
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
  await invokeAuthenticatedFunction('record-auth-session', { body: {} });
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
    throw new Error('Account profile mismatch. Please sign in again.');
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

export async function signOut() {
  invalidateUserCache();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function loadOAuthCallbackUser(code?: string) {
  let { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session && code) {
    const exchange = await supabase.auth.exchangeCodeForSession(code);
    if (exchange.error) throw exchange.error;
    sessionData = { session: exchange.data.session };
  }
  if (!sessionData.session)
    throw new Error('No Google session was returned. Please try again.');

  try {
    const user = await loadCurrentUser();
    if (!user)
      throw new Error('Your Google session has expired. Please sign in again.');
    return user;
  } catch (profileError) {
    if (
      !(profileError instanceof Error) ||
      !profileError.message.toLowerCase().includes('profile')
    )
      throw profileError;
    const { data, error } = await supabase.rpc('get_my_profile');
    const account = data?.account;
    if (error || !account || !['USER', 'WORKER'].includes(account.role))
      throw profileError;
    return {
      id: account.id,
      email: account.email,
      phone: account.mobile ?? '',
      name: '',
      role: account.role,
      emailVerified: Boolean(data.email_verified),
      profileComplete: false,
    };
  }
}
