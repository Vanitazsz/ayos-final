import { randomUUID } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';
import {
  normalizePhilippinePhone,
  workerRegistrationErrorMessage,
} from '@/lib/workerRegistration';

type WorkerApplicationInput = {
  email: string;
  password: string;
  displayName: string;
  bio: string;
  experience: string;
  frontId: string;
  backId: string;
  identityData: Record<string, unknown>;
};

type WorkerApplicationProgress =
  | 'Creating your worker account…'
  | 'Checking your worker profile…'
  | 'Uploading the front of your ID…'
  | 'Uploading the back of your ID…'
  | 'Submitting your worker verification…';

async function uploadDocument(userId: string, uri: string) {
  const response = await fetch(uri);
  if (!response.ok)
    throw new Error('Unable to read the selected identity document');
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 10 * 1024 * 1024) {
    throw new Error('Identity documents must be between 1 byte and 10 MB');
  }
  const path = `${userId}/${randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from('verification-documents')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

export async function submitWorkerApplication(
  input: WorkerApplicationInput,
  onProgress?: (message: WorkerApplicationProgress) => void,
) {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const paths: string[] = [];

  try {
    const phone = normalizePhilippinePhone(
      String(input.identityData.phone ?? ''),
    );
    const contactPhone = normalizePhilippinePhone(
      String(input.identityData.contactPhone ?? ''),
    );
    const identityData = { ...input.identityData, phone, contactPhone };
    let {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      onProgress?.('Creating your worker account…');
      const { data, error } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: { data: { name: displayName, role: 'WORKER', mobile: phone } },
      });
      if (error) throw error;
      session = data.session;
      if (!session) return { requiresEmailVerification: true as const };
    }

    if (session.user.email?.toLowerCase() !== email) {
      throw new Error(
        'The application email must match the authenticated worker account',
      );
    }

    onProgress?.('Checking your worker profile…');
    const { data: profile, error: profileError } =
      await supabase.rpc('get_my_profile');
    if (profileError) throw profileError;
    if (
      profile?.account?.id !== session.user.id ||
      profile?.account?.role !== 'WORKER'
    ) {
      throw new Error(
        'A dedicated worker account is required to submit this application',
      );
    }

    onProgress?.('Uploading the front of your ID…');
    paths.push(await uploadDocument(session.user.id, input.frontId));
    onProgress?.('Uploading the back of your ID…');
    paths.push(await uploadDocument(session.user.id, input.backId));
    onProgress?.('Submitting your worker verification…');
    const { data, error } = await supabase.rpc('submit_worker_application', {
      p_identity_data: identityData,
      p_document_paths: paths,
      p_bio: input.bio,
      p_experience: input.experience,
    });
    if (error) throw error;
    return { requiresEmailVerification: false as const, data };
  } catch (error) {
    if (paths.length)
      await supabase.storage.from('verification-documents').remove(paths);
    throw new Error(workerRegistrationErrorMessage(error));
  }
}
