import { randomUUID } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';

type VerificationProgress =
  | 'Uploading the front of your ID…'
  | 'Uploading the back of your ID…'
  | 'Submitting your verification…';

function verificationError(error: unknown): Error {
  const record =
    error && typeof error === 'object'
      ? (error as { code?: string; message?: string })
      : null;
  const value = `${record?.code ?? ''} ${record?.message ?? ''}`;

  if (value.includes('VERIFICATION_ALREADY_PENDING'))
    return new Error('You already have an identity verification awaiting review.');
  if (value.includes('INVALID_VERIFICATION_DOCUMENT'))
    return new Error('The uploaded ID documents could not be validated. Upload them again.');
  if (value.includes('CUSTOMER_REQUIRED') || value.includes('AUTHENTICATION_REQUIRED'))
    return new Error('Your session has expired. Sign in again before submitting.');
  if (
    value.includes('PGRST202') ||
    value.includes('42883') ||
    value.includes('submit_customer_verification')
  )
    return new Error('Identity verification is temporarily unavailable. Please try again shortly.');
  if (record?.message) return new Error(record.message);
  if (error instanceof Error) return error;
  return new Error('Unable to submit identity verification.');
}

async function uploadDocument(
  userId: string,
  uri: string,
  side: 'front' | 'back',
) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Unable to read the ${side} ID image`);
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 10 * 1024 * 1024) {
    throw new Error('Identity images must be between 1 byte and 10 MB');
  }
  const path = `${userId}/customer-${side}-${randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from('verification-documents')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

export async function submitCustomerVerification(input: {
  idType: string;
  frontUri: string;
  backUri: string;
}, onProgress?: (message: VerificationProgress) => void) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user)
    throw userError ?? new Error('Authentication required');
  const paths: string[] = [];
  try {
    onProgress?.('Uploading the front of your ID…');
    const front = await uploadDocument(
      userData.user.id,
      input.frontUri,
      'front',
    );
    paths.push(front);
    onProgress?.('Uploading the back of your ID…');
    const back = await uploadDocument(userData.user.id, input.backUri, 'back');
    paths.push(back);
    onProgress?.('Submitting your verification…');
    const { data, error } = await supabase.rpc('submit_customer_verification', {
      p_id_type: input.idType,
      p_front_url: front,
      p_back_url: back,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    if (paths.length)
      await supabase.storage.from('verification-documents').remove(paths);
    throw verificationError(error);
  }
}

export async function fetchMyCustomerVerification() {
  const { data, error } = await supabase
    .from('customer_verifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
