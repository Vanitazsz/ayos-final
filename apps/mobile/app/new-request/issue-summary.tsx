import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { theme } from '@/constants/theme';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Wrench,
  CreditCard,
} from 'lucide-react-native';
import {
  EdgeFunctionError,
  fetchWorkerRateEstimate,
  processAiJob,
  queueAiAnalysis,
  type WorkerRateEstimate,
} from '@/services/api';
import { subscribeToAiAnalysisJob } from '@/services/aiAnalysisSubscription';
import { useRequestStore } from '@/store/useRequestStore';
import { randomUUID } from '@/lib/crypto';

export default function IssueSummaryScreen() {
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
  const runningRef = useRef(false);
  const [pollTrigger, setPollTrigger] = useState(0);

  const start = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setStatus('loading');
    setError('');
    try {
      let jobId = draft.aiJobId;
      if (!jobId) {
        const job = await queueAiAnalysis({
          description: draft.description,
          media: draft.media,
          locale: 'en-PH',
          consentVersion: (
            process.env.EXPO_PUBLIC_AI_CONSENT_VERSION ?? '2026-07-21'
          )
            .replace(/^"|"$/g, '')
            .trim(),
          idempotencyKey: randomUUID(),
        });
        jobId = job.id;
        draft.setDraft({ aiJobId: jobId });
      }
      if (!jobId) throw new Error('AI job was not created');

      const completed = await processAiJob(jobId);
      if (completed.status === 'SUCCEEDED') {
        draft.setDraft({ aiResult: completed.result });
        setStatus('success');
      } else if (completed.status === 'FAILED') {
        setError(completed.error_message ?? 'AI processing failed.');
        setStatus('error');
      }
    } catch (reason) {
      if (
        reason instanceof EdgeFunctionError &&
        (reason.status === 409 || reason.code === 'job_not_processable')
      ) {
        // The job is still running server-side. The realtime subscription
        // below will deliver the outcome; the fallback poll covers realtime
        // being unavailable. Keep the screen in the loading state.
        setStatus('loading');
        setPollTrigger((n) => n + 1);
        return;
      }
      console.error('[issue-summary] AI analysis failed:', reason);
      setError(
        reason instanceof Error ? reason.message : 'AI processing failed.',
      );
      setStatus('error');
    } finally {
      runningRef.current = false;
    }
  }, [draft.aiJobId, draft.description, draft.media, draft.setDraft]);

  useEffect(() => {
    void start();
  }, [start]);

  // Live updates: deliver the final job outcome even if the kickoff request
  // above errored, so a transient failure never strands the user.
  useEffect(() => {
    const jobId = draft.aiJobId;
    if (!jobId) return;
    return subscribeToAiAnalysisJob(jobId, {
      onSucceeded: (res) => {
        draft.setDraft({ aiResult: res });
        setStatus('success');
      },
      onFailed: (msg) => {
        setError(msg);
        setStatus('error');
      },
    });
  }, [draft.aiJobId, draft.setDraft]);

  // Fallback poll: if realtime is unavailable and the job was already running
  // when we kicked off, poll until it reaches a terminal state or the cap.
  useEffect(() => {
    if (pollTrigger === 0 || status !== 'loading') return;
    const jobId = draft.aiJobId;
    if (!jobId) return;
    const INTERVAL_MS = 20_000;
    const MAX_ATTEMPTS = 6;
    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      if (!active) return;
      if (attempts >= MAX_ATTEMPTS) {
        setError(
          'AI analysis is taking longer than usual. You can retry or continue manually.',
        );
        setStatus('error');
        return;
      }
      timer = setTimeout(async () => {
        attempts += 1;
        try {
          const completed = await processAiJob(jobId);
          if (!active) return;
          if (completed.status === 'SUCCEEDED') {
            draft.setDraft({ aiResult: completed.result });
            setStatus('success');
          } else if (completed.status === 'FAILED') {
            setError(completed.error_message ?? 'AI processing failed.');
            setStatus('error');
          } else {
            schedule();
          }
        } catch (reason) {
          if (!active) return;
          const processing =
            reason instanceof EdgeFunctionError &&
            (reason.status === 409 || reason.code === 'job_not_processable');
          if (processing || attempts < MAX_ATTEMPTS) schedule();
          else {
            setError(
              'AI analysis is taking longer than usual. You can retry or continue manually.',
            );
            setStatus('error');
          }
        }
      }, INTERVAL_MS);
    };

    schedule();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [pollTrigger, status, draft.aiJobId, draft.setDraft]);

  const result = draft.aiResult;

  useEffect(() => {
    if (typeof result?.requestDraft === 'string')
      setEditableDraft(result.requestDraft);
  }, [result?.requestDraft]);

  useEffect(() => {
    if (
      !draft.categoryId ||
      !draft.coords ||
      !draft.scheduledAt
    ) {
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
          setRateError(
            'No live worker-rate estimate is currently available.',
          );
        }
      })
      .finally(() => {
        if (active) setRateLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    draft.categoryId,
    draft.coords,
    draft.scheduledAt,
    draft.searchRadiusKm,
  ]);

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

  return (
    <Screen
      scrollable
      keyboardAvoiding={false}
      contentContainerStyle={{ paddingBottom: 80 }}
      style={{ paddingBottom: 0 }}
    >
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.layout.screenPadding },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/home');
          }}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text
          style={[theme.typography.h4, { color: theme.colors.textPrimary }]}
        >
          Summary
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {status === 'loading' ? (
          <View style={styles.analyzingContainer}>
            <Sparkles color={theme.colors.primary} size={48} />
            <Text
              style={[theme.typography.h3, { marginBottom: theme.spacing.sm }]}
            >
              Analyzing your request...
            </Text>
            <Text
              style={[
                theme.typography.body2,
                {
                  color: theme.colors.textSecondary,
                  textAlign: 'center',
                  marginBottom: theme.spacing.xl,
                },
              ]}
            >
              AI is reviewing your request. Your photos are analyzed together
              with your description to generate a service summary.
            </Text>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <TouchableOpacity
              onPress={() => router.replace('/new-request/matching')}
              style={{ padding: theme.spacing.md }}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                Continue manually
              </Text>
            </TouchableOpacity>
          </View>
        ) : status === 'error' ? (
          <View style={styles.analyzingContainer}>
            <AlertTriangle color={theme.colors.error} size={48} />
            <Text style={theme.typography.h3}>Analysis unavailable</Text>
            <Text
              style={[
                theme.typography.body2,
                { textAlign: 'center', color: theme.colors.textSecondary },
              ]}
            >
              {error}
            </Text>
            <AppButton
              label="Retry AI"
              onPress={() => void start()}
              fullWidth
              style={{ marginTop: theme.spacing.lg }}
            />
            <TouchableOpacity
              onPress={() => router.replace('/new-request/matching')}
              style={{ padding: theme.spacing.md }}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                Continue manually
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.summaryContainer}>
            <View style={styles.successHeader}>
              <CheckCircle2 color={theme.colors.success} size={48} />
              <Text
                style={[theme.typography.h2, { marginTop: theme.spacing.md }]}
              >
                Analysis Complete
              </Text>
            </View>

            {result?.safetyCritical && (
              <View style={styles.card}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }]}>Safety Advice</Text>
                <View style={styles.safetyBox}>
                  <ShieldAlert color={theme.colors.error} size={20} />
                  <Text style={[theme.typography.caption, { color: theme.colors.error, marginLeft: 8, flex: 1 }]}>
                    {result.safetyAdvice?.join('\n')}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.card}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }]}>Issue Identified</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.md }}>
                <Wrench color={theme.colors.primary} size={16} style={{ marginTop: 2 }} />
                <Text style={[theme.typography.body1, { marginLeft: 8, flex: 1 }]}>
                  {result?.detectedIssue}
                </Text>
              </View>

              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }]}>Estimated Cost</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.xs }}>
                <CreditCard color={theme.colors.primary} size={16} style={{ marginTop: 2 }} />
                <Text style={[theme.typography.body1, { marginLeft: 8, flex: 1 }]}>
                  {rateLabel}
                </Text>
              </View>
              {!rateLoading && rateEstimate?.workerCount ? (
                <Text style={styles.rateNote}>
                  Based on {rateEstimate.workerCount} currently eligible{' '}
                  {rateEstimate.workerCount === 1 ? 'worker' : 'workers'}.
                  The selected worker&apos;s saved rate is the booking price.
                </Text>
              ) : <View style={{ marginBottom: theme.spacing.md }} />}

              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }]}>Editable Request Draft</Text>
              <AppInput
                accessibilityLabel="Editable request draft"
                multiline
                numberOfLines={5}
                value={editableDraft}
                onChangeText={setEditableDraft}
                error={
                  editableDraft.trim().length > 0 &&
                  editableDraft.trim().length < 10
                    ? 'Enter at least 10 characters.'
                    : undefined
                }
                style={styles.requestDraftInput}
                textAlignVertical="top"
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <AppButton
          label={
            result?.safetyCritical
              ? 'Continue to manual request'
              : 'Continue to AI Matching'
          }
          onPress={continueToMatching}
          disabled={status !== 'success' || editableDraft.trim().length < 10}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    paddingVertical: theme.spacing.xl,
    justifyContent: 'center',
  },
  analyzingContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  summaryContainer: { flex: 1, justifyContent: 'flex-start' },
  successHeader: { alignItems: 'center', marginBottom: theme.spacing.xxl },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  safetyBox: {
    flexDirection: 'row',
    backgroundColor: `${theme.colors.error}10`,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  rateNote: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  requestDraftInput: {
    minHeight: 120,
  },
  footer: { paddingVertical: theme.spacing.md },
});
