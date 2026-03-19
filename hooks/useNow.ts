'use client';

import { useEffect, useState } from 'react';

type Precision = 'minute' | 'second';

export function useNow(precision: Precision = 'minute') {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const syncNow = () => {
      setNow(new Date());
      const interval = precision === 'second' ? 1000 : 60000;
      const nextDelay = interval - (Date.now() % interval) + 50;
      timeoutId = setTimeout(syncNow, nextDelay);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        syncNow();
      }
    };

    const handleFocus = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      syncNow();
    };

    syncNow();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [precision]);

  return now;
}
