import { useEffect, useState } from 'react';

import { loadActiveSessionCount } from '../services/auth';

export function useActiveSessionCount() {
  const [activeSessions, setActiveSessions] = useState(0);
  useEffect(() => {
    let active = true;
    void loadActiveSessionCount()
      .then((count) => {
        if (active) setActiveSessions(count);
      })
      .catch(() => {
        if (active) setActiveSessions(0);
      });
    return () => {
      active = false;
    };
  }, []);
  return activeSessions;
}
