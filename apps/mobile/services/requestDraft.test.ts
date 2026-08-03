import { beforeEach, describe, expect, it } from 'vitest';
import { initialRequestDraft, useRequestStore } from '@/store/useRequestStore';

describe('useRequestStore', () => {
  beforeEach(() => useRequestStore.getState().reset());

  it('keeps legacy request-flow fields in the canonical draft', () => {
    const scheduledDate = new Date('2026-08-03T06:00:00.000Z');

    useRequestStore.getState().setDraft({
      urgency: 'This Week',
      status: 'Posted',
      selectedWorkerId: 'worker-id',
      scheduledDate,
      location: {
        latitude: 14.5995,
        longitude: 120.9842,
        address: 'Manila',
      },
    });

    expect(useRequestStore.getState()).toMatchObject({
      urgency: 'This Week',
      status: 'Posted',
      selectedWorkerId: 'worker-id',
      scheduledDate,
      location: {
        latitude: 14.5995,
        longitude: 120.9842,
        address: 'Manila',
      },
    });
  });

  it('restores every request field when reset', () => {
    useRequestStore.getState().setDraft({
      description: 'Changed',
      urgency: 'ASAP',
      requestId: 'request-id',
    });

    useRequestStore.getState().reset();

    const {
      setDraft: _setDraft,
      reset: _reset,
      ...draft
    } = useRequestStore.getState();
    expect(draft).toEqual(initialRequestDraft);
  });
});
