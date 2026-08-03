import React, { createContext, useContext, useEffect, useState } from 'react';
import { startForegroundWorkerPresence, type PresenceState } from '@/services/liveDispatch';

const WorkerPresenceContext = createContext<{ state: PresenceState; message: string }>({ state: 'starting', message: '' });

export function WorkerPresenceProvider({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  const [state, setState] = useState<PresenceState>('starting');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let stop = () => {};
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let starting = false;

    const scheduleRetry = () => {
      if (!active || retryTimer) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void start();
      }, 10_000);
    };

    const start = async () => {
      if (!active || starting) return;
      starting = true;
      try {
        const cleanup = await startForegroundWorkerPresence((next, detail) => {
          if (!active) return;
          setState(next);
          setMessage(detail ?? '');
          if (next === 'not_ready' || next === 'error') scheduleRetry();
          else if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
          }
        });
        if (active) stop = cleanup;
        else cleanup();
      } catch (error) {
        if (active) {
          setState('error');
          setMessage(
            error instanceof Error
              ? error.message
              : 'Unable to start live matching.',
          );
          scheduleRetry();
        }
      } finally {
        starting = false;
      }
    };

    void start();
    return () => {
      active = false;
      stop();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [enabled]);
  return <WorkerPresenceContext.Provider value={{ state, message }}>{children}</WorkerPresenceContext.Provider>;
}

export const useWorkerPresence = () => useContext(WorkerPresenceContext);
