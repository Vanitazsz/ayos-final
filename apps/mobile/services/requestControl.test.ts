import { describe, expect, it, vi } from 'vitest';
import { createRealtimeRefreshController } from './requestControl';

describe('createRealtimeRefreshController', () => {
  it('coalesces several realtime events into one refresh', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const controller = createRealtimeRefreshController(refresh, {
      coalesceMs: 250,
      fallbackMs: 60_000,
    });

    controller.request();
    controller.request();
    controller.request();
    await vi.advanceTimersByTimeAsync(249);
    expect(refresh).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    controller.stop();
    vi.useRealTimers();
  });

  it('polls only while a realtime subscription is unavailable', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const controller = createRealtimeRefreshController(refresh, {
      coalesceMs: 100,
      fallbackMs: 60_000,
    });

    controller.setStatus('booking', 'CHANNEL_ERROR');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    controller.setStatus('booking', 'SUBSCRIBED');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    controller.stop();
    vi.useRealTimers();
  });

  it('cancels pending refreshes and fallback polling when stopped', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const controller = createRealtimeRefreshController(refresh, {
      coalesceMs: 250,
      fallbackMs: 60_000,
    });

    controller.request();
    controller.setStatus('booking', 'TIMED_OUT');
    controller.stop();
    await vi.runAllTimersAsync();

    expect(refresh).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('runs one refresh at a time and keeps one trailing refresh', async () => {
    vi.useFakeTimers();
    let resolveRefresh: (() => void) | undefined;
    const refresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const controller = createRealtimeRefreshController(refresh, {
      coalesceMs: 250,
      fallbackMs: 60_000,
    });

    controller.request();
    await vi.advanceTimersByTimeAsync(250);
    expect(refresh).toHaveBeenCalledTimes(1);

    controller.request();
    controller.request();
    await vi.advanceTimersByTimeAsync(250);
    expect(refresh).toHaveBeenCalledTimes(1);

    resolveRefresh?.();
    await Promise.resolve();
    expect(refresh).toHaveBeenCalledTimes(2);

    controller.stop();
    vi.useRealTimers();
  });

  it('waits for every realtime channel before stopping fallback polling', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const controller = createRealtimeRefreshController(refresh, {
      coalesceMs: 100,
      fallbackMs: 60_000,
    });

    controller.setStatus('booking', 'SUBSCRIBED');
    controller.setStatus('location', 'CHANNEL_ERROR');
    controller.setStatus('status-events', 'SUBSCRIBED');
    await vi.advanceTimersByTimeAsync(60_100);
    expect(refresh).toHaveBeenCalledTimes(1);

    controller.setStatus('location', 'SUBSCRIBED');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    controller.stop();
    vi.useRealTimers();
  });
});
