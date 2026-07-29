import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { TextInput } from '@/components/inputs/TextInput';
import { theme } from '@/constants/theme';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import {
  fetchWorkerRateEstimate,
  processAiJob,
  queueAiAnalysis,
  type WorkerRateEstimate,
} from '@/services/api';
import { supabase } from '@/lib/supabase';
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

      const channel = supabase
        .channel(`ai-job-${activeJobId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ai_analysis_jobs',
            filter: `id=eq.${activeJobId}`,
          },
          (payload) => {
            const row = payload.new as any;
            if (row.status === 'SUCCEEDED') {
              draft.setDraft({ aiResult: row.result });
              setStatus('success');
              void supabase.removeChannel(channel);
            } else if (row.status === 'FAILED') {
              setError(row.error_message ?? 'AI processing failed.');
              setStatus('error');
              void supabase.removeChannel(channel);
            }
          },
        )
        .subscribe();

      const completed = await processAiJob(activeJobId);
      if (completed.status === 'SUCCEEDED') {
        draft.setDraft({ aiResult: completed.result });
        setStatus('success');
        void supabase.removeChannel(channel);
      } else if (completed.status === 'FAILED') {
        setError(completed.error_message ?? 'AI processing failed.');
        setStatus('error');
        void supabase.removeChannel(channel);
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
    if (
      !draft.categoryId ||
      !draft.coords ||
      !draft.scheduledAt ||
      draft.budgetMinor < 100
    ) {
      setRateLoading(false);
      setRateError('Complete the service budget and location to see rates.');
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
      maximumBudgetMinor: draft.budgetMinor,
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
    draft.budgetMinor,
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
    <Screen safeArea scrollable>
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
              AI is reviewing your request. Your photos and voice are analyzed
              together with your description to generate a service summary.
            </Text>
            <ActivityIndicator size="large" color={theme.colors.primary} />
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
            <Button
              title="Retry AI"
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
              <View
                style={[
                  styles.card,
                  { borderColor: theme.colors.error, borderWidth: 1 },
                ]}
              >
                <Text
                  style={[
                    theme.typography.label,
                    { color: theme.colors.error },
                  ]}
                >
                  Safety escalation required
                </Text>
                <Text style={theme.typography.body1}>
                  {result.safetyAdvice?.join('\n')}
                </Text>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.label}>Issue Identified</Text>
              <Text
                style={[
                  theme.typography.body1,
                  { marginBottom: theme.spacing.md },
                ]}
              >
                {result?.detectedIssue}
              </Text>

              <Text style={styles.label}>Estimated Repair Time</Text>
              <Text
                style={[
                  theme.typography.body1,
                  { marginBottom: theme.spacing.md },
                ]}
              >
                {result?.estimatedDurationMinutes} minutes
              </Text>

              <Text style={styles.label}>Estimated Cost</Text>
              <Text
                style={[
                  theme.typography.body1,
                  { marginBottom: theme.spacing.md },
                ]}
              >
                {rateLabel}
              </Text>
              {!rateLoading && rateEstimate?.workerCount ? (
                <Text style={styles.rateNote}>
                  Based on {rateEstimate.workerCount} currently eligible{' '}
                  {rateEstimate.workerCount === 1 ? 'worker' : 'workers'} within
                  your ₱
                  {(draft.budgetMinor / 100).toLocaleString('en-PH')} maximum.
                  The selected worker&apos;s saved rate is the booking price.
                </Text>
              ) : null}

              <Text style={styles.label}>Editable Request Draft</Text>
              <TextInput
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
        <Button
          title={
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
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
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
