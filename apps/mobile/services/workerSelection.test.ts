import { describe, expect, it, vi } from 'vitest';

import { createWorkerSelectionGate } from './workerSelection';

describe('createWorkerSelectionGate', () => {
  it('publishes loading state and returns a successful booking', async () => {
    const gate = createWorkerSelectionGate();
    const onStateChange = vi.fn();

    await expect(
      gate.run(
        'worker-id',
        async () => ({ id: 'booking-id' }),
        onStateChange,
        () => 'Choose another worker.',
      ),
    ).resolves.toEqual({ id: 'booking-id' });
    expect(onStateChange.mock.calls).toEqual([
      [{ workerId: 'worker-id', error: '' }],
      [{ workerId: null, error: '' }],
    ]);
  });

  it('exposes failures in UI state', async () => {
    const gate = createWorkerSelectionGate();
    const onStateChange = vi.fn();

    await expect(
      gate.run(
        'worker-id',
        async () => {
          throw new Error('WORKER_UNAVAILABLE');
        },
        onStateChange,
        (reason) => (reason as Error).message,
      ),
    ).resolves.toBeNull();
    expect(onStateChange).toHaveBeenLastCalledWith({
      workerId: null,
      error: 'Unable to accept this worker. WORKER_UNAVAILABLE',
    });
  });

  it('ignores a repeated selection while the first request is pending', async () => {
    const gate = createWorkerSelectionGate();
    const onStateChange = vi.fn();
    let finishFirst: ((value: { id: string }) => void) | undefined;
    const firstOperation = vi.fn(
      () =>
        new Promise<{ id: string }>((resolve) => {
          finishFirst = resolve;
        }),
    );
    const secondOperation = vi.fn(async () => ({ id: 'duplicate-booking' }));

    const first = gate.run(
      'worker-one',
      firstOperation,
      onStateChange,
      () => 'Choose another worker.',
    );
    await expect(
      gate.run(
        'worker-two',
        secondOperation,
        onStateChange,
        () => 'Choose another worker.',
      ),
    ).resolves.toBeNull();

    expect(secondOperation).not.toHaveBeenCalled();
    finishFirst?.({ id: 'booking-id' });
    await expect(first).resolves.toEqual({ id: 'booking-id' });
  });
});
