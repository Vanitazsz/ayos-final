import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft, Clock, Minus, Plus, Star, UsersRound } from 'lucide-react-native';
import { Image } from 'expo-image';

import { Button } from '@/components/buttons/Button';
import { RadiusSlider } from '@/components/inputs/RadiusSlider';
import { Screen } from '@/components/layout/Screen';
import { MapSurface } from '@/components/maps/MapSurface';
import { theme } from '@/constants/theme';
import { attachRequestMedia, publishServiceRequest, selectWorker } from '@/services/api';
import { getLiveDispatchSnapshot, normalizeSupabaseError, startLiveDispatch, subscribeToDispatch, type DispatchSnapshot, type LiveWorkerCandidate } from '@/services/liveDispatch';
import { getMatchDiagnostics, matchDiagnosticMessage, type MatchDiagnostics } from '@/services/workerMatching';
import { useRequestStore } from '@/store/useRequestStore';

type State = 'configuring' | 'starting' | 'live' | 'expired' | 'error';

export default function MatchingScreen() {
  const router = useRouter();
  const draft = useRequestStore();
  const [state, setState] = useState<State>('configuring');
  const [radiusKm, setRadiusKm] = useState(draft.searchRadiusKm);
  const [dispatchRequestId, setDispatchRequestId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DispatchSnapshot | null>(null);
  const [diagnostic, setDiagnostic] = useState<MatchDiagnostics | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!dispatchRequestId) return;
    let active = true;
    let stopRealtime = () => {};
    let poll: ReturnType<typeof setInterval> | null = null;
    let clock: ReturnType<typeof setInterval> | null = null;

    const refresh = async () => {
      try {
        const next = await getLiveDispatchSnapshot(dispatchRequestId);
        if (!active) return;
        setSnapshot(next);
        setNow(Date.now());
        if (Date.now() >= new Date(next.expiresAt).getTime()) {
          setState('expired');
          if (!next.candidates.some((item) => item.status === 'ACCEPTED')) {
            try {
              setDiagnostic(await getMatchDiagnostics(dispatchRequestId));
            } catch {
              // Diagnostics are supplementary; keep the completed-search state visible.
            }
          }
        } else {
          setState('live');
        }
      } catch (reason) {
        if (!active) return;
        const normalized = normalizeSupabaseError(reason, 'Matching could not be completed. Please try again.');
        console.error('[live-dispatch]', { code: (normalized as Error & { code?: string }).code, message: normalized.message });
        setError(normalized.message);
        setState('error');
      }
    };

    void refresh();
    stopRealtime = subscribeToDispatch(() => void refresh(), `service_request_id=eq.${dispatchRequestId}`);
    poll = setInterval(() => void refresh(), 10000);
    clock = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      active = false;
      stopRealtime();
      if (poll) clearInterval(poll);
      if (clock) clearInterval(clock);
    };
  }, [dispatchRequestId]);

  const candidates = useMemo(
    () => (snapshot?.candidates ?? []).filter((item) => item.status !== 'DECLINED'),
    [snapshot?.candidates],
  );
  const accepted = candidates.filter((item) => item.status === 'ACCEPTED');
  const secondsLeft = Math.max(0, Math.ceil((new Date(snapshot?.expiresAt ?? 0).getTime() - now) / 1000));

  const startMatching = async () => {
    try {
      if (!draft.coords) throw new Error('A confirmed service location is required.');
      if (!draft.categoryId) throw new Error('A service category is required.');
      draft.setDraft({ searchRadiusKm: radiusKm });

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

      setError('');
      setState('starting');
      const selectedRadiusMeters = radiusKm * 1000;
      const initialSnapshot = await startLiveDispatch(requestId, selectedRadiusMeters);
      setSnapshot(initialSnapshot);
      setNow(Date.now());
      setDispatchRequestId(requestId);
      setState('live');
    } catch (reason) {
      const normalized = normalizeSupabaseError(reason, 'Matching could not be completed. Please try again.');
      setError(normalized.message);
      setState('error');
    }
  };

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

  return (
    <Screen safeArea>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Go back" onPress={() => router.back()}>
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={theme.typography.h4}>Live Worker Matching</Text>
        <View style={{ width: 24 }} />
      </View>

      {state === 'configuring' ? (
        <RadiusConfiguration center={draft.coords} radiusKm={radiusKm} onChange={setRadiusKm} onStart={() => void startMatching()} />
      ) : null}

      {(state === 'starting' || state === 'live') ? (
        <View style={styles.status}>
          <View style={styles.statusCopy}>
            <Text style={theme.typography.h4}>Searching within {(snapshot?.searchRadiusMeters ?? radiusKm * 1000) / 1000} km</Text>
            <Text style={styles.secondary}>Matched workers will appear here as they respond.</Text>
            <View style={styles.matchCount}>
              <UsersRound size={16} color={theme.colors.primary} />
              <Text style={styles.matchCountText}>{candidates.length} notified · {accepted.length} accepted</Text>
            </View>
          </View>
          <View style={styles.timer}>
            <Clock size={16} color={theme.colors.primary} />
            <Text style={styles.timerText}>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</Text>
          </View>
        </View>
      ) : null}

      {state === 'error' ? <StateMessage title="Matching Unavailable" message={error} action="Try Again" onAction={() => { setError(''); setState('configuring'); }} /> : null}
      {state === 'expired' && !accepted.length ? <StateMessage title="No Worker Accepted Yet" message={matchDiagnosticMessage(diagnostic)} action="Change Date or Location" onAction={() => router.back()} /> : null}

      {(state === 'starting' || state === 'live' || accepted.length > 0) ? (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {!candidates.length ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><UsersRound size={30} color={theme.colors.primary} /></View>
              <Text style={theme.typography.h4}>Looking for workers</Text>
              <Text style={styles.emptyMessage}>We are notifying eligible workers within your selected {radiusKm} km range.</Text>
            </View>
          ) : candidates.map((worker) => (
            <WorkerCard key={worker.dispatchId} worker={worker} price={(draft.aiResult?.estimatedCostMinimumMinor ?? draft.budgetMinor) / 100} onChoose={() => void choose(worker)} />
          ))}
        </ScrollView>
      ) : null}
    </Screen>
  );
}

function RadiusConfiguration({ center, radiusKm, onChange, onStart }: { center: { latitude: number; longitude: number } | null; radiusKm: number; onChange: (radius: number) => void; onStart: () => void }) {
  return <ScrollView style={styles.configurationScroll} contentContainerStyle={styles.configuration} showsVerticalScrollIndicator={false}>
    <View style={styles.mapContainer}>{center ? <MapSurface center={center} points={[{ id: 'service-location', ...center, color: theme.colors.error }]} radiusMeters={radiusKm * 1000} animateRadius /> : <Text style={styles.secondary}>Confirm a service location first.</Text>}</View>
    <Text style={theme.typography.h3}>Choose search radius</Text>
    <Text style={styles.configurationMessage}>Only eligible workers within this distance will be notified.</Text>
    <View style={styles.radiusControlRow}>
      <TouchableOpacity accessibilityLabel="Decrease search radius" style={styles.controlButton} disabled={radiusKm <= 1} onPress={() => onChange(radiusKm - 1)}><Minus color={radiusKm > 1 ? theme.colors.primary : theme.colors.border} size={24} /></TouchableOpacity>
      <View style={styles.radiusValue}><Text style={[theme.typography.h1, { color: theme.colors.primary }]}>{radiusKm}</Text><Text style={[theme.typography.h4, styles.kilometers]}>km</Text></View>
      <TouchableOpacity accessibilityLabel="Increase search radius" style={styles.controlButton} disabled={radiusKm >= 50} onPress={() => onChange(radiusKm + 1)}><Plus color={radiusKm < 50 ? theme.colors.primary : theme.colors.border} size={24} /></TouchableOpacity>
    </View>
    <RadiusSlider minimumValue={1} maximumValue={50} step={1} value={radiusKm} onValueChange={onChange} minimumTrackTintColor={theme.colors.primary} maximumTrackTintColor={theme.colors.borderLight} thumbTintColor={theme.colors.primary} />
    <View style={styles.radiusLabels}><Text style={theme.typography.caption}>1 km</Text><Text style={theme.typography.caption}>50 km</Text></View>
    <Button title={`Start Matching within ${radiusKm} km`} onPress={onStart} fullWidth />
  </ScrollView>;
}

function StateMessage({ title, message, action, onAction }: { title: string; message: string; action: string; onAction: () => void }) {
  return <View style={styles.state}><AlertCircle size={56} color={theme.colors.error} /><Text style={theme.typography.h3}>{title}</Text><Text style={styles.secondary}>{message}</Text><Button title={action} onPress={onAction} fullWidth /></View>;
}

function WorkerCard({ worker, price, onChoose }: { worker: LiveWorkerCandidate; price: number; onChoose: () => void }) {
  const accepted = worker.status === 'ACCEPTED';
  return <View style={[styles.card, accepted && styles.acceptedCard]}><View style={styles.workerHeader}><Image source={worker.avatar || undefined} style={styles.avatar} /><View style={{ flex: 1 }}><Text style={theme.typography.h4}>{worker.name}</Text><Text style={styles.secondary}>{(worker.distanceMeters / 1000).toFixed(1)} km away · ₱{price.toLocaleString()} estimate</Text></View><View style={[styles.statusPill, accepted && styles.acceptedPill]}><Text style={styles.pillText}>{accepted ? 'Accepted' : 'Notified'}</Text></View></View><View style={styles.rating}><Star size={16} color={theme.colors.warning} /><Text>{Number(worker.rating).toFixed(1)} ({worker.reviewCount})</Text></View>{accepted ? <Button title="Choose Worker" onPress={onChoose} fullWidth /> : <Text style={styles.secondary}>Waiting for this worker to respond…</Text>}</View>;
}

const styles = StyleSheet.create({
  header: { height: 56, paddingHorizontal: theme.layout.screenPadding, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  configurationScroll: { flex: 1 },
  configuration: { padding: theme.layout.screenPadding, gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  mapContainer: { height: 220, borderRadius: theme.radius.xl, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.borderLight },
  configurationMessage: { color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.lg },
  radiusControlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: theme.spacing.md },
  controlButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.borderLight },
  radiusValue: { flexDirection: 'row', alignItems: 'center' },
  kilometers: { color: theme.colors.textSecondary, marginLeft: 4, marginTop: 8 },
  radiusLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.xl },
  status: { marginHorizontal: theme.layout.screenPadding, marginBottom: theme.spacing.md, padding: theme.spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.infoBackground, borderRadius: theme.radius.xl },
  statusCopy: { flex: 1, gap: 4 }, secondary: { color: theme.colors.textSecondary, textAlign: 'left' }, matchCount: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }, matchCountText: { color: theme.colors.primary, fontWeight: '700' }, timer: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.surface, padding: 10, borderRadius: theme.radius.lg }, timerText: { color: theme.colors.primary, fontWeight: '800' }, list: { flex: 1 }, listContent: { paddingHorizontal: theme.layout.screenPadding, paddingBottom: 32, gap: 12, flexGrow: 1 }, empty: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: theme.spacing.xl }, emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.infoBackground, alignItems: 'center', justifyContent: 'center' }, emptyMessage: { color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 }, card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, padding: theme.spacing.lg, gap: 12, ...theme.shadows.sm }, acceptedCard: { borderWidth: 2, borderColor: theme.colors.success }, workerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 }, avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.border }, statusPill: { backgroundColor: theme.colors.info, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 }, acceptedPill: { backgroundColor: theme.colors.success }, pillText: { color: '#fff', fontWeight: '700', fontSize: 12 }, rating: { flexDirection: 'row', alignItems: 'center', gap: 5 }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: theme.layout.screenPadding },
});
