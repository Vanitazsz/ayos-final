import { fetchWorkerVerification } from '../logic/WorkerVerificationScreenLogic';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
type StepStatus = 'done' | 'active' | 'pending' | 'rejected';

interface VerificationStep {
  id: string;
  label: string;
  desc: string;
  status: StepStatus;
  date?: string;
  note?: string;
}

interface Document {
  id: string;
  label: string;
  sub: string;
  status: 'uploaded' | 'verified' | 'rejected' | 'missing';
  date?: string;
}
export function useWorkerVerificationScreenController() {
  const [tab, setTab] = useState<'status' | 'documents' | 'faq'>('status');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [verification, setVerification] = useState<any>(null);
  useEffect(() => {
    let active = true;
    void fetchWorkerVerification().then((result) => {
      if (active && !result.error) setVerification(result.data);
    });
    return () => {
      active = false;
    };
  }, []);
  const status = verification?.status ?? 'PENDING';
  const submitted = verification?.created_at
    ? new Date(verification.created_at).toLocaleDateString()
    : 'Not submitted';
  const documents: Document[] = (verification?.document_paths ?? []).map(
    (path: string, index: number) => ({
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
    }),
  );
  const steps: VerificationStep[] = [
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
      desc: verification?.requested_notes ?? 'Application review status',
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
  return {
    tab,
    setTab,
    expandedFaq,
    setExpandedFaq,
    verification,
    status,
    submitted,
    documents,
    steps,
    router,
  };
}
