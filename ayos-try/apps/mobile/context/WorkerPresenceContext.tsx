import React, { createContext, useContext, useEffect, useState } from 'react';
import { startForegroundWorkerPresence, type PresenceState } from '@/services/liveDispatch';

const WorkerPresenceContext = createContext<{ state: PresenceState; message: string }>({ state: 'starting', message: '' });

export function WorkerPresenceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PresenceState>('starting');
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    let stop = () => {};
    void startForegroundWorkerPresence((next, detail) => { if (active) { setState(next); setMessage(detail ?? ''); } }).then((cleanup) => { if (active) stop = cleanup; else cleanup(); });
    return () => { active = false; stop(); };
  }, []);
  return <WorkerPresenceContext.Provider value={{ state, message }}>{children}</WorkerPresenceContext.Provider>;
}

export const useWorkerPresence = () => useContext(WorkerPresenceContext);
