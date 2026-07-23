import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  startForegroundWorkerPresence,
  type PresenceState,
} from '@/services/liveDispatch';

type WorkerPresenceValue = {
  state: PresenceState;
  message: string;
};

const WorkerPresenceContext = createContext<WorkerPresenceValue>({
  state: 'starting',
  message: '',
});

export function WorkerPresenceProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<PresenceState>('starting');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    let stopPresence = () => {};

    void startForegroundWorkerPresence((nextState, nextMessage) => {
      if (!active) return;
      setState(nextState);
      setMessage(nextMessage ?? '');
    }).then((stop) => {
      if (active) stopPresence = stop;
      else stop();
    });

    return () => {
      active = false;
      stopPresence();
    };
  }, []);

  const value = useMemo(() => ({ state, message }), [message, state]);

  return (
    <WorkerPresenceContext.Provider value={value}>
      {children}
    </WorkerPresenceContext.Provider>
  );
}

export function useWorkerPresence() {
  return useContext(WorkerPresenceContext);
}
