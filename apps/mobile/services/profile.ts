import { randomUUID } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';

export type AccountRole = 'USER' | 'WORKER' | 'ADMIN';

export interface ParticipantProfile {
  id: string;
  displayName: string;
  avatarPath: string | null;
  avatarUri: string;
}

export interface CustomerProfile extends ParticipantProfile {
  role: 'USER';
  email: string;
  mobile: string | null;
  status: string;
  emailVerified: boolean;
  profileComplete: boolean;
  defaultAddress: Record<string, unknown> | null;
  subdivisionId: string | null;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  preferredLocale: 'en' | 'fil';
}

export interface WorkerProfileView extends ParticipantProfile {
  role: 'WORKER';
  email: string;
  mobile: string | null;
  status: string;
  emailVerified: boolean;
  profileComplete: boolean;
  approvalStatus: string;
  bio: string | null;
  serviceArea: string | null;
  subdivisionId: string | null;
  preferredLocale: 'en' | 'fil';
}

export interface AdminProfile extends ParticipantProfile {
  role: 'ADMIN';
  email: string;
  mobile: string | null;
  status: string;
  emailVerified: boolean;
  profileComplete: boolean;
  givenName: string | null;
  familyName: string | null;
  location: string | null;
  bio: string | null;
}

type ProfileRpc = {
  account: {
    id: string;
    email: string;
    mobile: string | null;
    status: string;
    role: AccountRole;
    password_changed_at: string | null;
  };
  active_role: AccountRole;
  profile: Record<string, unknown> | null;
  default_address: Record<string, unknown> | null;
  email_verified: boolean;
  profile_complete: boolean;
};

export function requireIdentity(value: unknown, context: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${context} profile is incomplete`);
  return value.trim();
}

export async function resolveStorageImage(
  path: unknown,
  bucket = 'profile-avatars',
): Promise<string> {
  if (typeof path !== 'string' || !path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export const resolveProfileAvatar = (path: unknown) =>
  resolveStorageImage(path, 'profile-avatars');

export async function getMyProfile(): Promise<
  CustomerProfile | WorkerProfileView | AdminProfile
> {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw error;
  const result = data as ProfileRpc;
  if (!result?.account || !result.profile)
    throw new Error('Profile data is missing');
  const displayName = requireIdentity(result.profile.display_name, 'Account');
  const avatarPath =
    typeof result.profile.avatar_path === 'string'
      ? result.profile.avatar_path
      : null;
  const common = {
    id: result.account.id,
    email: result.account.email,
    mobile: result.account.mobile,
    status: result.account.status,
    displayName,
    avatarPath,
    avatarUri: await resolveProfileAvatar(avatarPath),
    emailVerified: Boolean(result.email_verified),
    profileComplete: Boolean(result.profile_complete),
  };
  if (result.active_role !== result.account.role)
    throw new Error('Account role integrity check failed');
  if (result.account.role === 'ADMIN')
    return {
      ...common,
      role: 'ADMIN',
      givenName:
        typeof result.profile.given_name === 'string'
          ? result.profile.given_name
          : null,
      familyName:
        typeof result.profile.family_name === 'string'
          ? result.profile.family_name
          : null,
      location:
        typeof result.profile.location === 'string'
          ? result.profile.location
          : null,
      bio: typeof result.profile.bio === 'string' ? result.profile.bio : null,
    };
  if (result.account.role === 'WORKER')
    return {
      ...common,
      role: 'WORKER',
      approvalStatus: requireIdentity(
        result.profile.approval_status,
        'Worker verification',
      ),
      bio: typeof result.profile.bio === 'string' ? result.profile.bio : null,
      serviceArea:
        typeof result.profile.service_area === 'string'
          ? result.profile.service_area
          : null,
      subdivisionId:
        typeof result.profile.subdivision_id === 'string'
          ? result.profile.subdivision_id
          : null,
      preferredLocale: result.profile.preferred_locale === 'fil' ? 'fil' : 'en',
    };
  return {
    ...common,
    role: 'USER',
    defaultAddress: result.default_address,
    subdivisionId:
      typeof result.profile.subdivision_id === 'string'
        ? result.profile.subdivision_id
        : null,
    verificationStatus: ['pending', 'verified', 'rejected'].includes(
      String(result.profile.verification_status),
    )
      ? (result.profile
          .verification_status as CustomerProfile['verificationStatus'])
      : 'unverified',
    preferredLocale: result.profile.preferred_locale === 'fil' ? 'fil' : 'en',
  };
}

export async function updateMyProfile(input: {
  displayName: string;
  mobile?: string | null;
  location?: string | null;
  bio?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  complete?: boolean;
}) {
  const method = input.complete ? 'complete_my_profile' : 'update_my_profile';
  const { error } = await supabase.rpc(method, {
    p_display_name: input.displayName.trim(),
    p_mobile: input.mobile || null,
    p_location: input.location || null,
    p_bio: input.bio || null,
    p_given_name: input.givenName || null,
    p_family_name: input.familyName || null,
  });
  if (error) throw error;
  return getMyProfile();
}

export async function uploadMyAvatar(uri: string, contentType = 'image/jpeg') {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user)
    throw userError ?? new Error('Authentication required');
  const response = await fetch(uri);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 5 * 1024 * 1024)
    throw new Error('Profile image must be 5 MB or smaller');
  const extension = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `${userData.user.id}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('profile-avatars')
    .upload(path, bytes, { contentType, upsert: false });
  if (uploadError) throw uploadError;
  const { error: profileError } = await supabase.rpc('set_my_avatar', {
    p_storage_path: path,
  });
  if (profileError) {
    await supabase.storage.from('profile-avatars').remove([path]);
    throw profileError;
  }
  return getMyProfile();
}

export async function changeMyPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  const { error: recordError } = await supabase.rpc(
    'record_my_password_change',
  );
  if (recordError) throw recordError;
}
