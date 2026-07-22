import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithPassword(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Enter a valid email address');
  if (!password) throw new Error('Password is required');
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
  if (error) throw error;
  if (!data.session) throw new Error('Supabase did not return an authenticated session');
  try {
    const user = await loadCurrentUser();
    await supabase.functions.invoke('record-auth-session', { body: {} });
    return user;
  } catch (profileError) {
    await supabase.auth.signOut({ scope: 'local' });
    throw profileError;
  }
}

export async function signUpCustomer(input: { email: string; password: string; name: string; mobile: string }) {
  const mobile = input.mobile.startsWith('0') ? `+63${input.mobile.slice(1)}` : input.mobile;
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(), password: input.password,
    options: { data: { role: 'USER', name: input.name.trim(), mobile }, emailRedirectTo: Linking.createURL('/auth/callback') },
  });
  if (error) throw error;
  return data;
}

export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'signup' });
  if (error) throw error;
  return data;
}

export async function resendEmailOtp(email: string) {
  const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase(), options: { emailRedirectTo: Linking.createURL('/auth/callback') } });
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: Linking.createURL('/auth/callback') });
  if (error) throw error;
}

export async function signInWithGoogle() {
  const redirectTo = Linking.createURL('/auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' } });
  if (error) throw error;
  if (Platform.OS === 'web') return;
  if (!data.url) throw new Error('Google authorization URL was not returned');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') throw new Error('Google sign-in was cancelled');
  if (result.type !== 'success') throw new Error('Google sign-in failed');
  const parsed = Linking.parse(result.url);
  const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;
  if (!code) throw new Error('OAuth callback did not contain an authorization code');
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  await supabase.functions.invoke('record-auth-session', { body: {} });
}

export async function loadCurrentUser() {
  const [{ data: sessionData }, { data: userData, error: userError }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);
  const session = sessionData.session;
  if (!session) return null;
  if (userError || !userData.user || userData.user.id !== session.user.id) {
    throw userError ?? new Error('Supabase session validation failed');
  }
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw error;
  const account=data?.account;const profile=data?.profile;
  if(!account||!profile||typeof profile.display_name!=='string'||!profile.display_name.trim())throw new Error('Profile setup is required');
  if(account.id!==userData.user.id)throw new Error('Profile identity does not match the authenticated account');
  if(account.status!=='ACTIVE'){await supabase.auth.signOut();throw new Error('This account is suspended or unavailable');}
  if(!['USER','WORKER'].includes(account.role)){
    await supabase.auth.signOut({scope:'local'});
    throw new Error('This account cannot use the customer and worker application');
  }
  if(data.active_role!==account.role)throw new Error('Account role integrity check failed');
  return{id:account.id,email:account.email,phone:account.mobile??'',name:profile.display_name.trim(),role:account.role,emailVerified:Boolean(data.email_verified),profileComplete:Boolean(data.profile_complete)};
}
