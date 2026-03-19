'use client';

import { useEffect, useState } from 'react';

export function useNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const syncNow = () => {
      setNow(new Date());
      const nextMinuteDelay = 60000 - (Date.now() % 60000) + 50;
      timeoutId = setTimeout(syncNow, nextMinuteDelay);
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
  }, []);

  return now;
}
