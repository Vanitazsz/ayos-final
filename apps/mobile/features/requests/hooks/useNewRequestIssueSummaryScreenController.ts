import {
  fetchWorkerRateEstimate,
  processAiJob,
  queueAiAnalysis,
  type WorkerRateEstimate,
  subscribeToAiAnalysisJob,
} from '../logic/NewRequestIssueSummaryScreenLogic';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useRequestStore } from '@/store/useRequestStore';
import { randomUUID } from '@/lib/crypto';

export function useNewRequestIssueSummaryScreenController() {
  const router = useRouter();
  const draft = useRequestStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [error, setError] = useState('');
  const [editableDraft, setEditableDraft] = useState('');
  const [rateEstimate, setRateEstimate] = useState<WorkerRateEstimate | null>(
    null,
  );
  const [rateLoading, setRateLoading] = useState(true);
  const [rateError, setRateError] = useState('');
  const start = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      let jobId = draft.aiJobId;
      if (!jobId) {
        const job = await queueAiAnalysis({
          description: draft.description,
          media: draft.media,
          locale: 'en-PH',
          consentVersion:
            process.env.EXPO_PUBLIC_AI_CONSENT_VERSION ?? '2026-07-21',
          idempotencyKey: randomUUID(),
        });
        jobId = job.id;
        draft.setDraft({ aiJobId: jobId });
      }
      if (!jobId) throw new Error('AI job was not created');
      const activeJobId = jobId;

      const unsubscribe = subscribeToAiAnalysisJob(activeJobId, {
        onSucceeded: (result) => {
          draft.setDraft({ aiResult: result });
          setStatus('success');
        },
        onFailed: (message) => {
          setError(message);
          setStatus('error');
        },
      });

      const completed = await processAiJob(activeJobId);
      if (completed.status === 'SUCCEEDED') {
        draft.setDraft({ aiResult: completed.result });
        setStatus('success');
        unsubscribe();
      } else if (completed.status === 'FAILED') {
        setError(completed.error_message ?? 'AI processing failed.');
        setStatus('error');
        unsubscribe();
      }
    } catch (reason) {
      console.error('[issue-summary] AI analysis failed:', reason);
      setError(
        reason instanceof Error ? reason.message : 'AI processing failed.',
      );
      setStatus('error');
    }
  }, [draft]);
  useEffect(() => {
    void start();
  }, []);
  const result = draft.aiResult;
  useEffect(() => {
    if (typeof result?.requestDraft === 'string')
      setEditableDraft(result.requestDraft);
  }, [result?.requestDraft]);
  useEffect(() => {
    if (!draft.categoryId || !draft.coords || !draft.scheduledAt) {
      setRateLoading(false);
      setRateError('Complete the service location to see worker rates.');
      return;
    }
    let active = true;
    setRateLoading(true);
    setRateError('');
    void fetchWorkerRateEstimate({
      categoryId: draft.categoryId,
      latitude: draft.coords.latitude,
      longitude: draft.coords.longitude,
      scheduledAt: draft.scheduledAt,
      searchRadiusMeters: draft.searchRadiusKm * 1000,
    })
      .then((estimate) => {
        if (active) setRateEstimate(estimate);
      })
      .catch(() => {
        if (active) {
          setRateEstimate(null);
          setRateError('No live worker-rate estimate is currently available.');
        }
      })
      .finally(() => {
        if (active) setRateLoading(false);
      });
    return () => {
      active = false;
    };
  }, [draft.categoryId, draft.coords, draft.scheduledAt, draft.searchRadiusKm]);
  const rateLabel = (() => {
    if (rateLoading) return 'Checking eligible worker rates…';
    const minimum = rateEstimate?.minimumRateMinor;
    const maximum = rateEstimate?.maximumRateMinor;
    if (
      rateError ||
      minimum == null ||
      maximum == null ||
      !rateEstimate?.workerCount
    )
      return 'No live worker-rate estimate is currently available.';
    const format = (minor: number) =>
      `₱${(minor / 100).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    return minimum === maximum
      ? `${format(minimum)} worker rate`
      : `${format(minimum)} – ${format(maximum)} worker-rate range`;
  })();
  const continueToMatching = () => {
    const nextDescription = editableDraft.trim();
    if (nextDescription.length < 10) return;
    draft.setDraft({
      description: nextDescription,
      aiResult: { ...(draft.aiResult ?? {}), requestDraft: nextDescription },
    });
    router.push('/new-request/matching');
  };
  return {
    router,
    status,
    error,
    editableDraft,
    setEditableDraft,
    rateEstimate,
    rateLoading,
    start,
    result,
    rateLabel,
    continueToMatching,
  };
}
