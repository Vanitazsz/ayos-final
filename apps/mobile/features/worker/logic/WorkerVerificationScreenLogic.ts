import { Colors } from '@/constants/theme';

export { fetchWorkerVerification } from '@/services/workerOperations';

export type DocumentStatus = 'uploaded' | 'verified' | 'rejected' | 'missing';

export interface Document {
  id: string;
  label: string;
  sub: string;
  status: DocumentStatus;
  date?: string;
}

export const documentStatusMeta: Record<
  DocumentStatus,
  { label: string; textColor: string; bg: string }
> = {
  verified: {
    label: 'Verified',
    textColor: Colors.verified,
    bg: '#E7F8F5',
  },
  uploaded: {
    label: 'In Review',
    textColor: Colors.warning,
    bg: '#FFF4D6',
  },
  rejected: {
    label: 'Rejected',
    textColor: Colors.error,
    bg: '#FFF0F0',
  },
  missing: {
    label: 'Missing',
    textColor: Colors.textTertiary,
    bg: '#F0F4FA',
  },
};

export const documentSummaryCounts = (documents: Document[]) => [
  {
    label: 'Verified',
    count: documents.filter((d) => d.status === 'verified').length,
    color: Colors.verified,
    bg: '#E7F8F5',
  },
  {
    label: 'In Review',
    count: documents.filter((d) => d.status === 'uploaded').length,
    color: Colors.warning,
    bg: '#FFF4D6',
  },
  {
    label: 'Issues',
    count: documents.filter(
      (d) => d.status === 'rejected' || d.status === 'missing',
    ).length,
    color: Colors.error,
    bg: '#FFF0F0',
  },
];

export const FAQ_ITEMS = [
  {
    q: 'How long does verification take?',
    a: "Standard verification takes 1–2 business days after all documents are submitted and complete. You'll receive a notification once the review is done.",
  },
  {
    q: 'Why was my document rejected?',
    a: 'Documents are rejected if they are blurry, expired, incomplete, or do not match the required type. Check the rejection note on each document for the specific reason.',
  },
  {
    q: 'Can I work while verification is pending?',
    a: 'No. You need to be fully verified before receiving booking requests. This protects both workers and customers on the platform.',
  },
  {
    q: "What happens if I'm rejected?",
    a: "You'll receive the specific reasons for rejection and can resubmit corrected documents. There is no limit on resubmissions.",
  },
  {
    q: 'How do I get the verified badge?',
    a: 'The verified badge is automatically added after an administrator approves the application.',
  },
];

export const formatVerificationStatus = (status: string) =>
  status.replaceAll('_', ' ');
