import { randomUUID } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';

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
}) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user)
    throw userError ?? new Error('Authentication required');
  const paths: string[] = [];
  try {
    const front = await uploadDocument(
      userData.user.id,
      input.frontUri,
      'front',
    );
    paths.push(front);
    const back = await uploadDocument(userData.user.id, input.backUri, 'back');
    paths.push(back);
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
    throw error;
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
