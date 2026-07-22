import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  MapPin,
  MessageSquare,
  Star,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import {
  attachRequestMedia,
  fetchRequest,
  generateMatches,
  publishServiceRequest,
  selectWorker,
} from '@/services/api';
import {
  getMatchDiagnostics,
  matchDiagnosticMessage,
  type MatchDiagnostics,
} from '@/services/workerMatching';
import { useRequestStore } from '@/store/useRequestStore';

type MatchState = 'searching' | 'results' | 'no_workers' | 'error';

type WorkerResult = {
  id: string;
  name: string;
  skill: string;
  rating: number;
  distance: string;
  confidence: number;
  price: string;
  avatar: string;
};

export default function MatchingScreen() {
  const router = useRouter();
  const draft = useRequestStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [matchState, setMatchState] = useState<MatchState>('searching');
  const [retryCount, setRetryCount] = useState(0);
  const [workers, setWorkers] = useState<WorkerResult[]>([]);
  const [diagnostic, setDiagnostic] = useState<MatchDiagnostics | null>(null);
  const [matchingError, setMatchingError] = useState('');
  const searchStartedAt = useRef(Date.now());
  const minDisplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (matchState !== 'searching') return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    let active = true;
    searchStartedAt.current = Date.now();

    const finishWithMinDisplay = (next: MatchState) => {
      const elapsed = Date.now() - searchStartedAt.current;
      const remaining = Math.max(0, 4000 - elapsed);
      if (remaining === 0) {
        if (active) setMatchState(next);
      } else {
        minDisplayTimer.current = setTimeout(() => {
          if (active) setMatchState(next);
        }, remaining);
      }
    };

    void (async () => {
      try {
        setMatchingError('');
        setDiagnostic(null);
        if (!draft.coords)
          throw new Error('A confirmed service location is required.');
        if (!draft.categoryId)
          throw new Error('A service category is required.');

        let requestId = draft.requestId;
        if (!requestId) {
          const scheduledAt =
            draft.scheduledAt ??
            new Date(
              Date.now() +
                (draft.aiResult?.urgency === 'emergency' ? 5 : 30) * 60000,
            ).toISOString();
          const created = await publishServiceRequest({
            categoryId: draft.categoryId,
            description: draft.aiResult?.requestDraft ?? draft.description,
            addressId: draft.addressId,
            address: draft.address,
            addressDetails: draft.addressDetails,
            latitude: draft.coords.latitude,
            longitude: draft.coords.longitude,
            scheduledAt,
            budgetMinor:
              draft.aiResult?.estimatedCostMinimumMinor ?? draft.budgetMinor,
            analysisId: draft.aiResult?.analysisId ?? null,
          });
          requestId = created.id;
          draft.setDraft({ requestId });
        }

        const activeRequestId = requestId as string;
        if (draft.media.length)
          await attachRequestMedia(activeRequestId, draft.media);
        if (
          draft.matchingMode === 'bidding' ||
          draft.aiResult?.safetyCritical
        ) {
          if (active)
            router.replace(`/request/${activeRequestId}` as never);
          return;
        }

        await generateMatches(activeRequestId);
        const request = await fetchRequest(activeRequestId);
        if (request.error)
          throw new Error(`Unable to load matching results: ${request.error}`);
        if (!active) return;

        const rows: WorkerResult[] = (
          request.data?.match_candidates ?? []
        ).map((candidate: any) => ({
          id: candidate.worker_id,
          name: candidate.worker_profiles?.display_name ?? '',
          skill:
            candidate.worker_profiles?.worker_skills?.[0]?.service_categories
              ?.name ?? '',
          rating: Number(candidate.factors?.rating ?? 0),
          distance: candidate.factors?.distance_meters
            ? `${(Number(candidate.factors.distance_meters) / 1000).toFixed(1)} km`
            : '',
          confidence: Math.min(100, Math.round(Number(candidate.score))),
          price: `₱${(
            (draft.aiResult?.estimatedCostMinimumMinor ?? draft.budgetMinor) /
            100
          ).toLocaleString()} estimate`,
          avatar: candidate.worker_profiles?.avatar_path ?? '',
        }));
        setWorkers(rows);

        if (rows.length) {
          finishWithMinDisplay('results');
          return;
        }

        const nextDiagnostic = await getMatchDiagnostics(activeRequestId);
        if (!active) return;
        setDiagnostic(nextDiagnostic);
        finishWithMinDisplay('no_workers');
      } catch (error) {
        if (!active) return;
        setMatchingError(
          error instanceof Error
            ? error.message
            : 'Matching could not be completed. Please try again.',
        );
        finishWithMinDisplay('error');
      }
    })();

    return () => {
      active = false;
      if (minDisplayTimer.current) clearTimeout(minDisplayTimer.current);
      pulse.stop();
      pulseAnim.stopAnimation();
    };
    // The retry counter intentionally restarts this one-shot request workflow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchState, pulseAnim, retryCount]);

  const retry = () => {
    setRetryCount((value) => value + 1);
    setMatchState('searching');
  };

  const handleHire = async (workerId: string) => {
    if (!draft.requestId) return;
    try {
      const booking = await selectWorker(draft.requestId, workerId);
      router.push(`/tracking/${booking.id}` as never);
    } catch (error) {
      Alert.alert(
        'Worker unavailable',
        error instanceof Error ? error.message : 'Select another worker.',
      );
      retry();
    }
  };

  const renderUnavailable = () => (
    <View style={styles.errorContainer}>
      <AlertCircle
        color={theme.colors.warning}
        size={64}
        style={styles.stateIcon}
      />
      <Text style={[theme.typography.h3, styles.stateTitle]}>
        No Eligible Workers
      </Text>
      <Text style={[theme.typography.body1, styles.stateDescription]}>
        {matchDiagnosticMessage(diagnostic)}
      </Text>
      <Button
        title="Retry Search"
        onPress={retry}
        style={styles.primaryAction}
        fullWidth
      />
      <Button
        title="Change Date or Location"
        variant="outlined"
        onPress={() => router.back()}
        fullWidth
      />
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <AlertCircle
        color={theme.colors.error}
        size={64}
        style={styles.stateIcon}
      />
      <Text style={[theme.typography.h3, styles.stateTitle]}>
        Matching Unavailable
      </Text>
      <Text style={[theme.typography.body1, styles.stateDescription]}>
        {matchingError}
      </Text>
      <Button
        title="Try Again"
        onPress={retry}
        style={styles.primaryAction}
        fullWidth
      />
      <Button
        title="Edit Request"
        variant="outlined"
        onPress={() => router.back()}
        fullWidth
      />
    </View>
  );

  return (
    <Screen safeArea>
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.layout.screenPadding },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={[theme.typography.h4, { color: theme.colors.textPrimary }]}>
          Worker Matching
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {matchState === 'searching' ? (
        <View style={styles.searchingContainer}>
          <Animated.View
            style={[
              styles.radarCenter,
              { transform: [{ scale: pulseAnim }] },
            ]}
          />
          <View style={styles.radarCenterSolid}>
            <MapPin color={theme.colors.surface} size={32} />
          </View>
          <Text style={[theme.typography.h3, styles.searchingTitle]}>
            Broadcasting Request...
          </Text>
          <Text style={[theme.typography.body2, styles.searchingDescription]}>
            Finding verified, available workers using service compatibility,
            distance, availability, and performance history.
          </Text>
        </View>
      ) : null}

      {matchState === 'no_workers' ? renderUnavailable() : null}
      {matchState === 'error' ? renderError() : null}

      {matchState === 'results' ? (
        <View style={styles.resultsContainer}>
          <Text style={[theme.typography.h3, styles.resultsTitle]}>
            Top Eligible Matches
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {workers.map((worker) => (
              <View key={worker.id} style={styles.workerCard}>
                <View style={styles.workerHeader}>
                  <Image
                    source={worker.avatar || undefined}
                    style={styles.avatarPlaceholder}
                    contentFit="cover"
                  />
                  <View style={styles.workerInfo}>
                    <Text style={theme.typography.h4}>{worker.name}</Text>
                    <Text
                      style={[
                        theme.typography.body2,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {worker.skill}
                    </Text>
                  </View>
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchBadgeText}>
                      {worker.confidence}% Match
                    </Text>
                  </View>
                </View>

                <View style={styles.workerStats}>
                  <View style={styles.stat}>
                    <Star
                      color={theme.colors.warning}
                      size={16}
                      fill={theme.colors.warning}
                    />
                    <Text style={[theme.typography.label, styles.rating]}>
                      {worker.rating}
                    </Text>
                  </View>
                  <Text style={{ color: theme.colors.border }}>|</Text>
                  <Text
                    style={[
                      theme.typography.label,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {worker.distance} away
                  </Text>
                  <Text style={{ color: theme.colors.border }}>|</Text>
                  <Text
                    style={[
                      theme.typography.label,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {worker.price}
                  </Text>
                </View>

                <View style={styles.workerActions}>
                  <Button
                    title="Message"
                    variant="outlined"
                    icon={MessageSquare}
                    style={styles.messageButton}
                    onPress={() =>
                      router.push(`/messages/chat?id=${worker.id}` as never)
                    }
                  />
                  <Button
                    title="Hire Now"
                    style={styles.hireButton}
                    onPress={() => void handleHire(worker.id)}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
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
  headerSpacer: { width: 40 },
  searchingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  radarCenter: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${theme.colors.primary}30`,
  },
  radarCenterSolid: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchingTitle: { marginTop: theme.spacing.xxxl },
  searchingDescription: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  stateIcon: { marginBottom: theme.spacing.lg },
  stateTitle: { marginBottom: theme.spacing.md },
  stateDescription: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xxxl,
  },
  primaryAction: { marginBottom: theme.spacing.md },
  resultsContainer: { flex: 1, paddingVertical: theme.spacing.md },
  resultsTitle: { marginBottom: theme.spacing.md },
  workerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.border,
    marginRight: theme.spacing.md,
  },
  workerInfo: { flex: 1 },
  matchBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  matchBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.surface,
    fontWeight: '700',
  },
  workerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  stat: { flexDirection: 'row', alignItems: 'center' },
  rating: { marginLeft: 4 },
  workerActions: { flexDirection: 'row', justifyContent: 'space-between' },
  messageButton: { flex: 1, marginRight: theme.spacing.sm },
  hireButton: { flex: 1 },
});
