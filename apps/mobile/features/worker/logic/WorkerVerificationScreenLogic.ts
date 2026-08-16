export { fetchWorkerVerification } from '@/services/api';
export { getMyProfile } from '@/services/profile';
export {
  deleteWorkerVerification,
  resubmitWorkerVerificationDocuments,
} from '@/services/workerApplication';
export { getBackRoute } from '@/constants/backRoutes';

export const ID_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'National ID (PhilSys)', value: 'philsys' },
  { label: "Driver's License", value: 'drivers_license' },
  { label: 'Passport', value: 'passport' },
  { label: 'UMID', value: 'umid' },
  { label: 'Postal ID', value: 'postal' },
  { label: 'PRC ID', value: 'prc' },
  { label: "Voter's ID", value: 'voters' },
  { label: 'Senior Citizen ID', value: 'senior' },
  { label: 'Other Government-issued ID', value: 'other' },
];

export type WorkerVerificationStatus =
  | 'PENDING'
  | 'NEEDS_DOCUMENTS'
  | 'REJECTED'
  | 'APPROVED'
  | (string & {});

export type VerificationStepStatus = 'done' | 'active' | 'pending' | 'rejected';
export type DocumentStatus = 'uploaded' | 'verified' | 'rejected' | 'missing';
export type StatusTone = 'verified' | 'warning' | 'error' | 'info' | 'neutral';

export interface VerificationStep {
  id: string;
  label: string;
  desc: string;
  status: VerificationStepStatus;
  date?: string;
  note?: string;
}

export interface VerificationDocument {
  id: string;
  label: string;
  sub: string;
  status: DocumentStatus;
  date?: string;
}

export interface WorkerVerification {
  status?: string;
  created_at?: string;
  document_paths?: string[] | null;
  requested_notes?: string | null;
  identity_data?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export function getSubmittedIdType(
  verification: WorkerVerification | null,
): string {
  const idType = verification?.identity_data?.idType;
  return typeof idType === 'string' ? idType : '';
}

export function getStatusLabel(status: string): string {
  return status.replaceAll('_', ' ');
}

export function getVerificationTone(status: string): StatusTone {
  if (status === 'APPROVED') return 'verified';
  if (status === 'REJECTED') return 'error';
  if (status === 'NEEDS_DOCUMENTS') return 'warning';
  return 'info';
}

export function buildDocuments(
  verification: WorkerVerification | null,
  status: string,
): VerificationDocument[] {
  const submitted = verification?.created_at
    ? new Date(verification.created_at).toLocaleDateString()
    : 'Not submitted';
  return (verification?.document_paths ?? []).map((path: string, index: number) => ({
    id: path,
    label: `Submitted document ${index + 1}`,
    sub: path.split('/').pop() ?? 'Private file',
    status:
      status === 'APPROVED'
        ? 'verified'
        : status === 'REJECTED'
          ? 'rejected'
          : 'uploaded',
    date: submitted,
  }));
}

export function buildSteps(
  status: string,
  documents: VerificationDocument[],
  requestedNotes?: string | null,
): VerificationStep[] {
  return [
    {
      id: 'register',
      label: 'Registration',
      desc: 'Account created and profile information submitted',
      status: 'done',
    },
    {
      id: 'documents',
      label: 'Document Upload',
      desc: `${documents.length} private document(s) submitted`,
      status: documents.length ? 'done' : 'pending',
    },
    {
      id: 'review',
      label: 'Administrator Review',
      desc: requestedNotes ?? 'Application review status',
      status:
        status === 'APPROVED'
          ? 'done'
          : status === 'REJECTED'
            ? 'rejected'
            : 'active',
      note: status,
    },
    {
      id: 'activate',
      label: 'Profile Activated',
      desc: 'Visible to eligible customers after approval',
      status: status === 'APPROVED' ? 'done' : 'pending',
    },
  ];
}

export function getDocRowTone(docStatus: DocumentStatus): StatusTone {
  if (docStatus === 'verified') return 'verified';
  if (docStatus === 'uploaded') return 'warning';
  if (docStatus === 'rejected') return 'error';
  return 'neutral';
}

export function getDocRowLabel(docStatus: DocumentStatus): string {
  if (docStatus === 'verified') return 'Verified';
  if (docStatus === 'uploaded') return 'In Review';
  if (docStatus === 'rejected') return 'Rejected';
  return 'Missing';
}
