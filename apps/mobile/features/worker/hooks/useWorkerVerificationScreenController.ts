import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useGoBack } from '@/hooks/useGoBack';
import { showAlert } from '@/components/AppAlert';
import {
  buildDocuments,
  buildSteps,
  fetchWorkerVerification,
  getBackRoute,
  getMyProfile,
  removeWorkerVerificationDocument,
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
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [verification, setVerification] = useState<WorkerVerification | null>(
    null,
  );
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const verificationResult = await fetchWorkerVerification();
      if (verificationResult.error) {
        setLoadError(verificationResult.error);
      } else {
        setVerification(verificationResult.data);
      }
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load verification',
      );
    }
    try {
      const profileResult = await getMyProfile();
      setProfileComplete(profileResult.profileComplete);
    } catch {
      // The verification record is sufficient to render this screen. Account
      // details are optional here and may be unavailable during migrations.
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const refreshVerification = () => {
    void fetchWorkerVerification().then((result) => {
      if (!result.error) setVerification(result.data);
    });
  };

  const [draftFront, setDraftFront] = useState<string | null>(null);
  const [draftBack, setDraftBack] = useState<string | null>(null);
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [resubmitting, setResubmitting] = useState(false);
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
  const canResubmit =
    status === 'NEEDS_DOCUMENTS' ||
    status === 'REJECTED' ||
    documents.length === 0;

  const toggleFaq = (question: string) => {
    setExpandedFaq((current) => (current === question ? null : question));
  };

  const pickDocument = async (side: 'front' | 'back') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (result.canceled) return;
      if (side === 'front') setDraftFront(result.assets[0].uri);
      else setDraftBack(result.assets[0].uri);
    } catch (error) {
      showAlert(
        'Select document',
        error instanceof Error ? error.message : 'Unable to select the image',
      );
    }
  };

  const confirmRemoveDocument = (path: string) => {
    showAlert(
      'Remove document',
      'This document will be permanently removed from your verification.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusyPath(path);
              try {
                await removeWorkerVerificationDocument(path);
                refreshVerification();
              } catch (error) {
                showAlert(
                  'Remove document',
                  error instanceof Error
                    ? error.message
                    : 'Unable to remove the document',
                );
              } finally {
                setBusyPath(null);
              }
            })();
          },
        },
      ],
    );
  };

  const submitDraft = () => {
    if (!draftFront || !draftBack) return;
    void (async () => {
      setResubmitting(true);
      try {
        await resubmitWorkerVerificationDocuments(
          draftFront,
          draftBack,
          (message) => setProgressMessage(message),
        );
        setDraftFront(null);
        setDraftBack(null);
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
    expandedFaq,
    toggleFaq,
    loading,
    loadError,
    reload: load,
    verification,
    profileComplete,
    status,
    submitted,
    documents,
    steps,
    doneCount,
    canEditDocs,
    canResubmit,
    draftFront,
    draftBack,
    busyPath,
    resubmitting,
    progressMessage,
    pickDocument,
    confirmRemoveDocument,
    submitDraft,
  };
}
