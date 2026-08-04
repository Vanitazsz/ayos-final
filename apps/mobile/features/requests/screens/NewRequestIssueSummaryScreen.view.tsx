import { styles } from './NewRequestIssueSummaryScreen.styles';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { LegacyButton as Button } from '@/components/AppButton';
import { LegacyTextInput as TextInput } from '@/components/AppInput';
import { theme } from '@/constants/theme';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import type { useNewRequestIssueSummaryScreenController } from '../hooks/useNewRequestIssueSummaryScreenController';
import {
  MIN_DESCRIPTION_LENGTH,
  descriptionIsValid,
} from '../logic/NewRequestIssueSummaryScreenLogic';

export function IssueSummaryView({
  model,
}: {
  model: ReturnType<typeof useNewRequestIssueSummaryScreenController>;
}) {
  const {
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
  } = model;
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
                  {rateEstimate.workerCount === 1 ? 'worker' : 'workers'}. The
                  selected worker&apos;s saved rate is the booking price.
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
                  !descriptionIsValid(editableDraft)
                    ? `Enter at least ${MIN_DESCRIPTION_LENGTH} characters.`
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
          disabled={
            status !== 'success' || !descriptionIsValid(editableDraft)
          }
          fullWidth
        />
      </View>
    </Screen>
  );
}
