import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';
import {
  normalizePhilippinePhone,
  workerRegistrationErrorMessage,
} from '@/lib/workerRegistration';
import { verifyEmailDeliverability } from '@/lib/emailVerification';

export type WorkerApplicationInput = {
  email: string;
  password: string;
  displayName: string;
  bio: string;
  experience: string;
  frontId: string;
  backId: string;
  identityData: Record<string, unknown>;
  resumeToken?: string;
};

export type WorkerApplicationProgress =
  | 'Creating your worker account…'
  | 'Checking your worker profile…'
  | 'Uploading the front of your ID…'
  | 'Uploading the back of your ID…'
  | 'Submitting your worker verification…';

let pendingWorkerApplicationBuffer: WorkerApplicationInput | null = null;

const PENDING_WORKER_APPLICATION_KEY = 'pending-worker-application';

export async function savePendingWorkerApplication(input: WorkerApplicationInput) {
  pendingWorkerApplicationBuffer = input;
  await AsyncStorage.setItem(
    PENDING_WORKER_APPLICATION_KEY,
    JSON.stringify(input),
  );
}

export function getPendingWorkerApplication(): WorkerApplicationInput | null {
  return pendingWorkerApplicationBuffer;
}

export async function clearPendingWorkerApplication() {
  pendingWorkerApplicationBuffer = null;
  await AsyncStorage.removeItem(PENDING_WORKER_APPLICATION_KEY);
}

/**
 * Restores a persisted pending application (e.g. after an app restart) into the
 * in-memory buffer so the OTP resume path can complete the registration.
 */
export async function hydratePendingWorkerApplication() {
  if (pendingWorkerApplicationBuffer) return;
  try {
    const stored = await AsyncStorage.getItem(PENDING_WORKER_APPLICATION_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored) as WorkerApplicationInput;
    if (parsed && typeof parsed.email === 'string' && parsed.email.trim()) {
      pendingWorkerApplicationBuffer = parsed;
    }
  } catch {
    // Ignore malformed or unreadable persisted applications.
  }
}

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

/**
 * Converts an image URI (file/blob/data URL) into a base64 data URL so a
 * pending application can be shipped to the server before the account exists.
 * The verification-documents bucket only accepts authenticated uploads, so the
 * resume payload must carry the raw image bytes instead.
 */
async function toBase64DataUrl(uri: string) {
  const response = await fetch(uri);
  if (!response.ok)
    throw new Error('Unable to read the selected identity document');
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(index, index + chunkSize),
    );
  }
  const base64 = btoa(binary);
  const mime = /^data:([^;,]+)/.exec(uri)?.[1] ?? 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

async function savePendingWorkerApplicationToServer(
  input: WorkerApplicationInput,
  resumeToken: string,
) {
  const payload = {
    ...input,
    frontId: await toBase64DataUrl(input.frontId),
    backId: await toBase64DataUrl(input.backId),
    resumeToken,
  };
  const { error } = await supabase.rpc('save_pending_worker_registration', {
    p_resume_token: resumeToken,
    p_email: input.email,
    p_payload: payload,
  });
  if (error) throw error;
}

async function fetchPendingWorkerApplicationFromServer(resumeToken: string) {
  const { data, error } = await supabase.rpc(
    'get_pending_worker_registration',
    { p_resume_token: resumeToken },
  );
  if (error) throw error;
  if (!data) return null;
  return data as WorkerApplicationInput;
}

async function clearPendingWorkerApplicationFromServer(resumeToken: string) {
  const { error } = await supabase.rpc('clear_pending_worker_registration', {
    p_resume_token: resumeToken,
  });
  if (error) throw error;
}

export async function submitWorkerApplication(
  input: WorkerApplicationInput,
  onProgress?: (message: WorkerApplicationProgress) => void,
) {
  const email = await verifyEmailDeliverability(input.email);
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
      if (data.user?.identities?.length === 0) {
        throw new Error(
          workerRegistrationErrorMessage({ code: 'user_already_exists' }),
        );
      }
      session = data.session;
      if (!session) {
        const resumeToken = input.resumeToken ?? randomUUID();
        const pending = { ...input, resumeToken };
        try {
          await savePendingWorkerApplicationToServer(pending, resumeToken);
        } catch (serverError) {
          // A server copy is a reload safety net; if it cannot be saved the
          // local copy still covers this session, so do not block the OTP flow.
          console.warn('Failed to persist pending registration:', serverError);
        }
        await savePendingWorkerApplication(pending);
        return { requiresEmailVerification: true as const, resumeToken };
      }
    }

    if (session.user.email?.trim().toLowerCase() !== email.trim().toLowerCase()) {
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
    if (input.resumeToken) {
      try {
        await clearPendingWorkerApplicationFromServer(input.resumeToken);
      } catch {
        // Best-effort cleanup; an orphaned pending row expires on its own.
      }
    }
    await clearPendingWorkerApplication();
    return { requiresEmailVerification: false as const, data };
  } catch (error) {
    if (paths.length)
      await supabase.storage.from('verification-documents').remove(paths);
    throw new Error(workerRegistrationErrorMessage(error));
  }
}

/**
 * Automatically resumes pending worker application submission after OTP verification completes.
 */
export async function completePendingWorkerApplication(
  resumeToken?: string,
  onProgress?: (message: WorkerApplicationProgress) => void,
) {
  await hydratePendingWorkerApplication();
  let pending = getPendingWorkerApplication();
  if (!pending && resumeToken) {
    try {
      pending = await fetchPendingWorkerApplicationFromServer(resumeToken);
    } catch {
      pending = null;
    }
    if (pending) pendingWorkerApplicationBuffer = pending;
  }
  if (!pending) return { completed: false };
  const res = await submitWorkerApplication(pending, onProgress);
  return { completed: true, data: res };
}

export type WorkerDocumentResubmitProgress =
  | 'Uploading the front of your ID…'
  | 'Uploading the back of your ID…'
  | 'Submitting your updated documents…';

/**
 * Replaces the current identity documents with a freshly uploaded front/back pair
 * and records which government ID type was submitted.
 */
export async function resubmitWorkerVerificationDocuments(
  frontId: string,
  backId: string,
  idType: string,
  onProgress?: (message: WorkerDocumentResubmitProgress) => void,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to resubmit your documents.');

  const paths: string[] = [];
  try {
    onProgress?.('Uploading the front of your ID…');
    paths.push(await uploadDocument(user.id, frontId));
    onProgress?.('Uploading the back of your ID…');
    paths.push(await uploadDocument(user.id, backId));
    onProgress?.('Submitting your updated documents…');
    const { data, error } = await supabase.rpc(
      'resubmit_worker_verification_documents',
      { p_document_paths: paths, p_id_type: idType },
    );
    if (error) throw error;
    return data;
  } catch (error) {
    if (paths.length)
      await supabase.storage.from('verification-documents').remove(paths);
    throw new Error(workerRegistrationErrorMessage(error));
  }
}

/**
 * Deletes the worker's entire verification submission while it is still
 * actionable (PENDING or NEEDS_DOCUMENTS). The ID files are removed through the
 * Storage API first (direct SQL deletion of storage.objects is blocked by
 * Supabase), then the worker_verifications row is deleted by the RPC and the
 * worker profile returns to its initial un-submitted state.
 */
export async function deleteWorkerVerification(documentPaths: string[]) {
  try {
    if (documentPaths.length) {
      const { error: removeError } = await supabase.storage
        .from('verification-documents')
        .remove(documentPaths);
      if (removeError) throw removeError;
    }
    const { data, error } = await supabase.rpc('delete_worker_verification');
    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(workerRegistrationErrorMessage(error));
  }
}
