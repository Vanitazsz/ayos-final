import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft, Clock, MapPin, Star } from 'lucide-react-native';
import { Image } from 'expo-image';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { MapSurface } from '@/components/maps/MapSurface';
import { theme } from '@/constants/theme';
import { attachRequestMedia, publishServiceRequest, selectWorker } from '@/services/api';
import {
  getLiveDispatchSnapshot,
  normalizeSupabaseError,
  startLiveDispatch,
  subscribeToDispatch,
  type DispatchDiagnostics,
  type DispatchSnapshot,
  type LiveWorkerCandidate,
} from '@/services/liveDispatch';
import { useRequestStore } from '@/store/useRequestStore';

type State = 'starting' | 'live' | 'expired' | 'error';

const waveLabel = (wave: number) =>
  wave === 1
    ? 'Searching within 5 km'
    : wave === 2
      ? 'Expanding search to 10 km'
      : 'Searching every eligible service area';

const diagnosticMessage = (diagnostic: DispatchDiagnostics | null) => {
  switch (diagnostic?.reasonCode) {
    case 'NO_ACTIVE_WORKERS': return 'No active worker accounts are available.';
    case 'NO_CATEGORY_WORKERS': return 'No active workers have the requested service skill.';
    case 'NO_APPROVED_WORKERS': return 'Matching workers are still awaiting approval.';
    case 'WORKERS_OFFLINE': return 'Eligible workers have not enabled Available for matching.';
    case 'NO_FRESH_PRESENCE': return 'Workers are configured, but no fresh live location was received in the last 30 seconds.';
    case 'OUTSIDE_SEARCH_RADIUS': return 'Online workers are outside the current search radius. The search will expand automatically.';
    case 'OUTSIDE_WORKING_HOURS': return 'Nearby online workers are outside their configured working schedule.';
    case 'WAITING_FOR_RESPONSE': return 'Nearby workers were notified. Waiting for someone to accept.';
    default: return 'No eligible workers are available for this request right now.';
  }
};

export default function MatchingScreen() {
  const router = useRouter();
  const draft = useRequestStore();
  const [state, setState] = useState<State>('starting');
  const [snapshot, setSnapshot] = useState<DispatchSnapshot | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const started = useRef(false);

  useEffect(() => {
    let active = true;
    let stopRealtime = () => {};
    let poll: ReturnType<typeof setInterval> | null = null;
    let clock: ReturnType<typeof setInterval> | null = null;
    const load = async () => {
      try {
        if (!draft.coords) throw new Error('A confirmed service location is required.');
        if (!draft.categoryId) throw new Error('A service category is required.');
        let requestId = draft.requestId;
        if (!requestId) {
          const scheduledAt = draft.scheduledAt ?? new Date(Date.now() + (draft.aiResult?.urgency === 'emergency' ? 5 : 30) * 60000).toISOString();
          const created = await publishServiceRequest({
            categoryId: draft.categoryId,
            description: draft.aiResult?.requestDraft ?? draft.description,
            addressId: draft.addressId,
            address: draft.address,
            addressDetails: draft.addressDetails,
            latitude: draft.coords.latitude,
            longitude: draft.coords.longitude,
            scheduledAt,
            budgetMinor: draft.aiResult?.estimatedCostMinimumMinor ?? draft.budgetMinor,
            analysisId: draft.aiResult?.analysisId ?? null,
          });
          requestId = created.id;
          draft.setDraft({ requestId });
          if (draft.media.length) await attachRequestMedia(created.id, draft.media);
        }
        if (draft.matchingMode === 'bidding' || draft.aiResult?.safetyCritical) {
          router.replace(`/request/${requestId}` as never);
          return;
        }
        const id = requestId as string;
        const refresh = async () => {
          const next = started.current ? await getLiveDispatchSnapshot(id) : await startLiveDispatch(id);
          started.current = true;
          if (!active) return;
          setSnapshot(next);
          setNow(Date.now());
          setState(Date.now() >= new Date(next.expiresAt).getTime() ? 'expired' : 'live');
        };
        await refresh();
        stopRealtime = subscribeToDispatch(() => void refresh(), `service_request_id=eq.${id}`);
        poll = setInterval(() => void refresh(), 10000);
        clock = setInterval(() => setNow(Date.now()), 1000);
      } catch (reason) {
        if (!active) return;
        const normalized = normalizeSupabaseError(reason, 'Matching could not be completed. Please try again.');
        console.error('[live-dispatch]', { code: (normalized as Error & { code?: string }).code, message: normalized.message });
        setError(normalized.message);
        setState('error');
      }
    };
    void load();
    return () => {
      active = false;
      stopRealtime();
      if (poll) clearInterval(poll);
      if (clock) clearInterval(clock);
    };
    // This workflow intentionally starts once for the persisted draft request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const secondsLeft = Math.max(0, Math.ceil((new Date(snapshot?.expiresAt ?? 0).getTime() - now) / 1000));
  const candidates = useMemo(() => (snapshot?.candidates ?? []).filter((item) => item.status !== 'DECLINED'), [snapshot?.candidates]);
  const accepted = candidates.filter((item) => item.status === 'ACCEPTED');
  const points = useMemo(() => draft.coords ? [
    { id: 'customer', latitude: draft.coords.latitude, longitude: draft.coords.longitude, color: theme.colors.error },
    ...candidates.map((item) => ({ id: item.workerId, latitude: Number(item.latitude), longitude: Number(item.longitude), color: item.status === 'ACCEPTED' ? theme.colors.success : theme.colors.primary })),
  ] : [], [candidates, draft.coords]);

  const choose = async (worker: LiveWorkerCandidate) => {
    if (!draft.requestId) return;
    try {
      const booking = await selectWorker(draft.requestId, worker.workerId);
      draft.setDraft({ bookingId: booking.id });
      router.replace(`/tracking/${booking.id}` as never);
    } catch (reason) {
      Alert.alert('Worker unavailable', normalizeSupabaseError(reason, 'Choose another worker.').message);
    }
  };

  return <Screen safeArea>
    <View style={styles.header}><TouchableOpacity accessibilityLabel="Go back" onPress={() => router.back()}><ArrowLeft color={theme.colors.textPrimary} size={24} /></TouchableOpacity><Text style={theme.typography.h4}>Live Worker Matching</Text><View style={{ width: 24 }} /></View>
    {draft.coords && <View style={styles.map}><MapSurface center={draft.coords} points={points} radiusMeters={snapshot?.wave === 1 ? 5000 : snapshot?.wave === 2 ? 10000 : undefined} /><View style={styles.mapBadge}><MapPin size={15} color={theme.colors.primary} /><Text style={styles.badgeText}>{candidates.length} nearby · {accepted.length} accepted</Text></View></View>}
    {(state === 'starting' || state === 'live') && <View style={styles.status}><View style={{ flex: 1 }}><Text style={theme.typography.h4}>{snapshot ? waveLabel(snapshot.wave) : 'Starting live search…'}</Text><Text style={styles.secondary}>Workers appear as their live location and response arrive.</Text></View><View style={styles.timer}><Clock size={16} color={theme.colors.primary} /><Text style={styles.timerText}>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</Text></View></View>}
    {state === 'live' && !candidates.length && snapshot?.diagnostics ? <EligibilityDiagnostic diagnostic={snapshot.diagnostics} /> : null}
    {state === 'error' ? <StateMessage title="Matching Unavailable" message={error} action="Edit Request" onAction={() => router.back()} /> : null}
    {state === 'expired' && !accepted.length ? <StateMessage title="No Worker Accepted Yet" message={diagnosticMessage(snapshot?.diagnostics ?? null)} action="Change Date or Location" onAction={() => router.back()} /> : null}
    {(state === 'live' || accepted.length > 0) && <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>{!candidates.length ? <View style={styles.empty}><Text style={styles.secondary}>Waiting for online workers in the current search area…</Text></View> : candidates.map((worker) => <WorkerCard key={worker.dispatchId} worker={worker} price={(draft.aiResult?.estimatedCostMinimumMinor ?? draft.budgetMinor) / 100} onChoose={() => void choose(worker)} />)}</ScrollView>}
  </Screen>;
}

function StateMessage({ title, message, action, onAction }: { title: string; message: string; action: string; onAction: () => void }) {
  return <View style={styles.state}><AlertCircle size={56} color={theme.colors.error} /><Text style={theme.typography.h3}>{title}</Text><Text style={styles.secondary}>{message}</Text><Button title={action} onPress={onAction} fullWidth /></View>;
}

function EligibilityDiagnostic({ diagnostic }: { diagnostic: DispatchDiagnostics }) {
  const counts = diagnostic.counts;
  return <View style={styles.diagnostic}><Text style={styles.diagnosticTitle}>{diagnosticMessage(diagnostic)}</Text><Text style={styles.secondary}>Active {counts.active} · Skilled {counts.skilled} · Approved {counts.approved} · Online {counts.available} · Live location {counts.freshPresence} · In range {counts.withinWave} · On schedule {counts.scheduled}</Text></View>;
}

function WorkerCard({ worker, price, onChoose }: { worker: LiveWorkerCandidate; price: number; onChoose: () => void }) {
  const accepted = worker.status === 'ACCEPTED';
  return <View style={[styles.card, accepted && styles.acceptedCard]}><View style={styles.workerHeader}><Image source={worker.avatar || undefined} style={styles.avatar} /><View style={{ flex: 1 }}><Text style={theme.typography.h4}>{worker.name}</Text><Text style={styles.secondary}>{(worker.distanceMeters / 1000).toFixed(1)} km away · ₱{price.toLocaleString()} estimate</Text></View><View style={[styles.statusPill, accepted && styles.acceptedPill]}><Text style={styles.pillText}>{accepted ? 'Accepted' : 'Notified'}</Text></View></View><View style={styles.rating}><Star size={16} color={theme.colors.warning} /><Text>{Number(worker.rating).toFixed(1)} ({worker.reviewCount})</Text></View>{accepted ? <Button title="Choose Worker" onPress={onChoose} fullWidth /> : <Text style={styles.secondary}>Waiting for this worker to respond…</Text>}</View>;
}

const styles = StyleSheet.create({
  header: { height: 56, paddingHorizontal: theme.layout.screenPadding, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  map: { height: 300, marginHorizontal: theme.layout.screenPadding, borderRadius: theme.radius.xl, overflow: 'hidden', position: 'relative' },
  mapBadge: { position: 'absolute', left: 12, bottom: 12, backgroundColor: 'rgba(255,255,255,.96)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', gap: 6, alignItems: 'center' },
  badgeText: { fontWeight: '700', color: theme.colors.textPrimary },
  status: { padding: theme.layout.screenPadding, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  secondary: { color: theme.colors.textSecondary, textAlign: 'left' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.infoBackground, padding: 10, borderRadius: theme.radius.lg },
  timerText: { color: theme.colors.primary, fontWeight: '800' },
  diagnostic: { marginHorizontal: theme.layout.screenPadding, marginBottom: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.infoBackground, gap: 5 },
  diagnosticTitle: { fontWeight: '700', color: theme.colors.textPrimary },
  list: { flex: 1 }, listContent: { paddingHorizontal: theme.layout.screenPadding, paddingBottom: 32, gap: 12 }, empty: { padding: 24, alignItems: 'center' },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, padding: theme.spacing.lg, gap: 12, ...theme.shadows.sm },
  acceptedCard: { borderWidth: 2, borderColor: theme.colors.success }, workerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.border }, statusPill: { backgroundColor: theme.colors.info, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  acceptedPill: { backgroundColor: theme.colors.success }, pillText: { color: '#fff', fontWeight: '700', fontSize: 12 }, rating: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: theme.layout.screenPadding },
});
