import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { attachRequestMedia, publishServiceRequest, selectWorker } from '@/services/api';
import {
  getLiveDispatchSnapshot,
  normalizeSupabaseError,
  startLiveDispatch,
  subscribeToDispatch,
  LIVE_DISPATCH_REFRESH_INTERVAL_MS,
  type DispatchSnapshot,
  type LiveWorkerCandidate,
} from '@/services/liveDispatch';
import { createWorkerSelectionGate } from '@/services/workerSelection';
import { useRequestStore } from '@/store/useRequestStore';

type State = 'configuring' | 'starting' | 'live' | 'expired' | 'error';

export function useLiveMatching() {
  const draft = useRequestStore();
  const [state, setState] = useState<State>('configuring');
  const [radiusKm, setRadiusKm] = useState(draft.searchRadiusKm);
  const [dispatchRequestId, setDispatchRequestId] = useState<string | null>(
    null,
  );
  const [snapshot, setSnapshot] = useState<DispatchSnapshot | null>(null);
  const [error, setError] = useState('');
  const [selectionError, setSelectionError] = useState('');
  const [selectingWorkerId, setSelectingWorkerId] = useState<string | null>(
    null,
  );
  const selectionGate = useRef(createWorkerSelectionGate());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!dispatchRequestId) return;
    let active = true;
    let stopRealtime = () => {};
    let poll: ReturnType<typeof setInterval> | null = null;
    let clock: ReturnType<typeof setInterval> | null = null;
    let realtimeSubscribed = false;

    const refresh = async () => {
      try {
        const next = await getLiveDispatchSnapshot(dispatchRequestId);
        if (!active) return;
        setSnapshot(next);
        setNow(Date.now());
        if (Date.now() >= new Date(next.expiresAt).getTime()) {
          setState('expired');
        } else {
          setState('live');
        }
      } catch (reason) {
        if (!active) return;
        const normalized = normalizeSupabaseError(
          reason,
          'Matching could not be completed. Please try again.',
        );
        console.error('[live-dispatch]', {
          code: (normalized as Error & { code?: string }).code,
          message: normalized.message,
        });
        setError(normalized.message);
        setState('error');
      }
    };

    const syncPoll = (status?: string) => {
      if (status) realtimeSubscribed = status === 'SUBSCRIBED';
      if (realtimeSubscribed && poll) {
        clearInterval(poll);
        poll = null;
      } else if (!realtimeSubscribed && !poll) {
        poll = setInterval(
          () => void refresh(),
          LIVE_DISPATCH_REFRESH_INTERVAL_MS,
        );
      }
    };

    void refresh();
    stopRealtime = subscribeToDispatch(
      () => void refresh(),
      `service_request_id=eq.${dispatchRequestId}`,
      syncPoll,
    );
    syncPoll();
    clock = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      active = false;
      stopRealtime();
      if (poll) clearInterval(poll);
      if (clock) clearInterval(clock);
    };
  }, [dispatchRequestId]);

  const candidates = useMemo(
    () =>
      (snapshot?.candidates ?? []).filter((item) => item.status !== 'DECLINED'),
    [snapshot?.candidates],
  );
  const accepted = useMemo(
    () => candidates.filter((item) => item.status === 'ACCEPTED'),
    [candidates],
  );
  const secondsLeft = Math.max(
    0,
    Math.ceil((new Date(snapshot?.expiresAt ?? 0).getTime() - now) / 1000),
  );

  const startMatching = useCallback(async () => {
    try {
      if (!draft.coords)
        throw new Error('A confirmed service location is required.');
      if (!draft.categoryId) throw new Error('A service category is required.');
      draft.setDraft({ searchRadiusKm: radiusKm });

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
          analysisId: draft.aiResult?.analysisId ?? null,
        });
        requestId = created.id;
        draft.setDraft({ requestId });
        if (draft.media.length)
          await attachRequestMedia(created.id, draft.media);
      }

      if (!requestId) throw new Error('Service request missing');
      setError('');
      setState('starting');
      const initialSnapshot = await startLiveDispatch(
        requestId,
        radiusKm * 1000,
      );
      setSnapshot(initialSnapshot);
      setNow(Date.now());
      setDispatchRequestId(requestId);
      setState('live');
    } catch (reason) {
      const normalized = normalizeSupabaseError(
        reason,
        'Matching could not be completed. Please try again.',
      );
      setError(normalized.message);
      setState('error');
    }
  }, [draft, radiusKm]);

  const choose = useCallback(
    async (worker: LiveWorkerCandidate) => {
      const requestId = draft.requestId;
      if (!requestId) {
        setSelectionError(
          'This service request is unavailable. Return and start matching again.',
        );
        return null;
      }
      const booking = await selectionGate.current.run(
        worker.workerId,
        () => selectWorker(requestId, worker.workerId),
        (next) => {
          setSelectingWorkerId(next.workerId);
          setSelectionError(next.error);
        },
        (reason) =>
          normalizeSupabaseError(reason, 'Choose another worker.').message,
      );
      if (!booking) return null;
      draft.setDraft({ bookingId: booking.id });
      return booking;
    },
    [draft],
  );

  const reset = useCallback(() => {
    setError('');
    setState('configuring');
  }, []);

  return {
    state,
    center: draft.coords,
    radiusKm,
    setRadiusKm,
    snapshot,
    error,
    selectionError,
    selectingWorkerId,
    candidates,
    accepted,
    secondsLeft,
    startMatching,
    choose,
    reset,
  };
}
