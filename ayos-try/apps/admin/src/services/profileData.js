import { supabase } from '../lib/supabase';

async function signedAvatar(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage.from('profile-avatars').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function loadAdminProfile() {
  const [{ data, error }, { data: sessionData }, { data: factors, error: factorError }] = await Promise.all([
    supabase.rpc('get_my_profile'),
    supabase.auth.getSession(),
    supabase.auth.mfa.listFactors(),
  ]);
  if (error) throw error;
  if (factorError) throw factorError;
  if (!data?.account || !data.profile?.display_name) throw new Error('Administrator profile is missing');
  const { data: events, error: eventError } = await supabase.from('authentication_events').select('*').eq('account_id', data.account.id).order('created_at', { ascending: false }).limit(50);
  if (eventError) throw eventError;
  return {
    id: data.account.id,
    displayName: data.profile.display_name,
    givenName: data.profile.given_name ?? '',
    familyName: data.profile.family_name ?? '',
    email: data.account.email,
    phone: data.account.mobile ?? '',
    role: data.account.role,
    location: data.profile.location ?? '',
    bio: data.profile.bio ?? '',
    avatarPath: data.profile.avatar_path ?? null,
    avatarUri: await signedAvatar(data.profile.avatar_path),
    joined: data.account.created_at,
    passwordChangedAt: data.account.password_changed_at ?? null,
    profileComplete: Boolean(data.profile_complete),
    emailVerified: Boolean(data.email_verified),
    mfaFactors: [...(factors?.totp ?? []), ...(factors?.phone ?? [])].filter((factor) => factor.status === 'verified'),
    session: sessionData.session,
    authenticationEvents: events ?? [],
  };
}

export async function saveAdminProfile(input, currentEmail) {
  if (input.email.trim().toLowerCase() !== currentEmail.toLowerCase()) {
    const { error: emailError } = await supabase.auth.updateUser({ email: input.email.trim().toLowerCase() });
    if (emailError) throw emailError;
  }
  const displayName = [input.givenName.trim(), input.familyName.trim()].filter(Boolean).join(' ');
  const { error } = await supabase.rpc(input.complete ? 'complete_my_profile' : 'update_my_profile', {
    p_display_name: displayName,
    p_mobile: input.phone.trim() || null,
    p_location: input.location.trim() || null,
    p_bio: input.bio.trim() || null,
    p_given_name: input.givenName.trim() || null,
    p_family_name: input.familyName.trim() || null,
  });
  if (error) throw error;
  return loadAdminProfile();
}

export async function uploadAdminAvatar(file) {
  if (!file.type.startsWith('image/')) throw new Error('Select an image file');
  if (file.size > 5 * 1024 * 1024) throw new Error('Profile image must be 5 MB or smaller');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Authentication required');
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from('profile-avatars').upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { error: profileError } = await supabase.rpc('set_my_avatar', { p_storage_path: path });
  if (profileError) {
    await supabase.storage.from('profile-avatars').remove([path]);
    throw profileError;
  }
  return loadAdminProfile();
}

export async function changeAdminPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  const { error: recordError } = await supabase.rpc('record_my_password_change');
  if (recordError) throw recordError;
}

export function describeUserAgent(value) {
  if (!value) return { device: '', browser: '', mobile: false };
  const mobile = /Android|iPhone|iPad|Mobile/i.test(value);
  const browser = /Edg\//.test(value) ? 'Edge' : /Chrome\//.test(value) ? 'Chrome' : /Safari\//.test(value) && !/Chrome\//.test(value) ? 'Safari' : /Firefox\//.test(value) ? 'Firefox' : '';
  const device = /iPhone/i.test(value) ? 'iPhone' : /iPad/i.test(value) ? 'iPad' : /Android/i.test(value) ? 'Android device' : mobile ? 'Mobile device' : 'Computer';
  return { device, browser, mobile };
}
