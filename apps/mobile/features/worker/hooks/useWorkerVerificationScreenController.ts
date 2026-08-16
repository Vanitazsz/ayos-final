import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { showAlert } from '@/components/AppAlert';
import { resolveStorageImage } from '@/services/profile';
import {
  buildDocuments,
  buildSteps,
  deleteWorkerVerification,
  fetchWorkerVerification,
  getBackRoute,
  getSubmittedIdType,
  resubmitWorkerVerificationDocuments,
  type VerificationDocument,
  type VerificationStep,
  type WorkerVerification,
  type WorkerVerificationStatus,
} from '../logic/WorkerVerificationScreenLogic';

export type VerificationTab = 'status' | 'documents' | 'faq';

export function useWorkerVerificationScreenController() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const goBack = useGoBack('/(worker)/profile');
  const handleBack = () => {
    const route = getBackRoute(from);
    if (route) router.push(route);
    else goBack();
  };

  const [tab, setTab] = useState<VerificationTab>('status');
  const [existingDocUrls, setExistingDocUrls] = useState<{
    front: string;
    back: string;
  }>({ front: '', back: '' });
  const [verification, setVerification] = useState<WorkerVerification | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const resolveExistingDocs = async (
    paths: WorkerVerification['document_paths'],
  ): Promise<{ front: string; back: string }> => {
    if (!paths || paths.length === 0) return { front: '', back: '' };
    try {
      const [front, back] = await Promise.all([
        resolveStorageImage(paths[0], 'verification-documents'),
        resolveStorageImage(paths[1], 'verification-documents'),
      ]);
      return { front, back };
    } catch {
      return { front: '', back: '' };
    }
  };

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const verificationResult = await fetchWorkerVerification();
      if (verificationResult.error) {
        setLoadError(verificationResult.error);
        setExistingDocUrls({ front: '', back: '' });
      } else {
        setVerification(verificationResult.data);
        setExistingDocUrls(
          await resolveExistingDocs(verificationResult.data?.document_paths),
        );
        if (!draftIdType)
          setDraftIdType(getSubmittedIdType(verificationResult.data));
      }
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load verification',
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const refreshVerification = () => {
    void fetchWorkerVerification().then((result) => {
      if (!result.error) {
        setVerification(result.data);
        void resolveExistingDocs(result.data?.document_paths).then(
          setExistingDocUrls,
        );
        if (!draftIdType)
          setDraftIdType(getSubmittedIdType(result.data));
      }
    });
  };

  const [draftFront, setDraftFront] = useState<string | null>(null);
  const [draftBack, setDraftBack] = useState<string | null>(null);
  const [draftIdType, setDraftIdType] = useState('');
  const [idTypeError, setIdTypeError] = useState('');
  const [resubmitting, setResubmitting] = useState(false);
  const [deletingSubmission, setDeletingSubmission] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  const status: WorkerVerificationStatus = verification?.status ?? 'PENDING';
  const submitted = verification?.created_at
    ? new Date(verification.created_at).toLocaleDateString()
    : 'Not submitted';
  const documents: VerificationDocument[] = buildDocuments(
    verification,
    status,
  );
  const steps: VerificationStep[] = buildSteps(
    status,
    documents,
    verification?.requested_notes,
  );
  const doneCount = steps.filter((step) => step.status === 'done').length;
  const canEditDocs = status === 'PENDING' || status === 'NEEDS_DOCUMENTS';
  const canDeleteSubmission = canEditDocs && documents.length > 0;
  const canResubmit =
    status === 'NEEDS_DOCUMENTS' ||
    status === 'REJECTED' ||
    documents.length === 0;

  const confirmDeleteSubmission = () => {
    const paths = verification?.document_paths ?? [];
    showAlert(
      'Delete submission',
      'Your entire verification submission will be permanently deleted, including your identity data and all uploaded documents. You can submit a new application afterward.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeletingSubmission(true);
              try {
                await deleteWorkerVerification(paths);
                refreshVerification();
              } catch (error) {
                showAlert(
                  'Delete submission',
                  error instanceof Error
                    ? error.message
                    : 'Unable to delete the submission',
                );
              } finally {
                setDeletingSubmission(false);
              }
            })();
          },
        },
      ],
    );
  };

  const submitDraft = () => {
    if (!draftFront || !draftBack) return;
    if (!draftIdType) {
      setIdTypeError('Select the type of ID you are submitting');
      return;
    }
    void (async () => {
      setResubmitting(true);
      try {
        await resubmitWorkerVerificationDocuments(
          draftFront,
          draftBack,
          draftIdType,
          (message) => setProgressMessage(message),
        );
        setDraftFront(null);
        setDraftBack(null);
        setDraftIdType('');
        setIdTypeError('');
        setProgressMessage(null);
        refreshVerification();
      } catch (error) {
        showAlert(
          'Submit documents',
          error instanceof Error ? error.message : 'Unable to submit documents',
        );
      } finally {
        setResubmitting(false);
      }
    })();
  };

  return {
    router,
    handleBack,
    tab,
    setTab,
    loading,
    loadError,
    reload: load,
    verification,
    existingDocUrls,
    status,
    submitted,
    documents,
    steps,
    doneCount,
    canEditDocs,
    canResubmit,
    canDeleteSubmission,
    draftFront,
    draftBack,
    setDraftFront,
    setDraftBack,
    draftIdType,
    setDraftIdType,
    idTypeError,
    setIdTypeError,
    resubmitting,
    deletingSubmission,
    progressMessage,
    confirmDeleteSubmission,
    submitDraft,
  };
}
