type RefreshControllerOptions = {
  coalesceMs: number;
  fallbackMs: number;
};

const CONNECTED_STATUS = 'SUBSCRIBED';

export function createRealtimeRefreshController(
  refresh: () => void | Promise<void>,
  options: RefreshControllerOptions,
) {
  const statuses = new Map<string, string>();
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let fallbackTimer: ReturnType<typeof setInterval> | null = null;
  let refreshInFlight = false;
  let refreshQueued = false;
  let stopped = false;

  const runRefresh = async () => {
    if (stopped) return;
    if (refreshInFlight) {
      refreshQueued = true;
      return;
    }
    refreshInFlight = true;
    try {
      await refresh();
    } finally {
      refreshInFlight = false;
      if (refreshQueued && !stopped) {
        refreshQueued = false;
        void runRefresh();
      }
    }
  };

  const request = () => {
    if (stopped || refreshTimer) {
      if (refreshInFlight) refreshQueued = true;
      return;
    }
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      void runRefresh();
    }, options.coalesceMs);
  };

  const syncFallback = () => {
    if (stopped) return;
    const connected =
      statuses.size > 0 &&
      [...statuses.values()].every((status) => status === CONNECTED_STATUS);
    if (connected && fallbackTimer) {
      clearInterval(fallbackTimer);
      fallbackTimer = null;
    } else if (!connected && statuses.size > 0 && !fallbackTimer) {
      fallbackTimer = setInterval(() => {
        void runRefresh();
      }, options.fallbackMs);
    }
  };

  return {
    request,
    setStatus(key: string, status: string) {
      if (stopped) return;
      statuses.set(key, status);
      syncFallback();
    },
    stop() {
      stopped = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      if (fallbackTimer) clearInterval(fallbackTimer);
      refreshTimer = null;
      fallbackTimer = null;
      refreshQueued = false;
      statuses.clear();
    },
  };
}
