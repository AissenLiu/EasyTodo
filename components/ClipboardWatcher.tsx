'use client';

import { useEffect, useRef } from 'react';

const POLL_INTERVAL = 1200;

function isTauriDesktop() {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || window.navigator.userAgent.includes('Tauri');
}

export default function ClipboardWatcher() {
  const latestTextRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!isTauriDesktop()) return;

    let isMounted = true;
    let timer: number | null = null;
    let readClipboardText: null | (() => Promise<string>) = null;

    const syncToDatabase = async (content: string) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      try {
        await fetch('/api/clipboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, source: 'system' })
        });
      } catch (error) {
        console.error('Failed to sync clipboard history:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    const tick = async () => {
      if (!isMounted || !readClipboardText) return;

      try {
        const text = await readClipboardText();
        if (!isMounted || typeof text !== 'string' || text.length === 0) return;

        if (latestTextRef.current === null) {
          latestTextRef.current = text;
          return;
        }

        if (text === latestTextRef.current) return;

        latestTextRef.current = text;
        await syncToDatabase(text);
      } catch (error) {
        console.error('Failed to read clipboard text:', error);
      }
    };

    (async () => {
      try {
        const plugin = await import('@tauri-apps/plugin-clipboard-manager');
        if (!isMounted) return;

        readClipboardText = plugin.readText;
        await tick();
        timer = window.setInterval(tick, POLL_INTERVAL);
      } catch (error) {
        console.error('Clipboard plugin unavailable:', error);
      }
    })();

    return () => {
      isMounted = false;
      if (timer !== null) {
        window.clearInterval(timer);
      }
    };
  }, []);

  return null;
}
