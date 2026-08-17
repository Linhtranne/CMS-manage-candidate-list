'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const EXIT_FALLBACK_MS = 180;

export function usePresence(open: boolean) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExitTimer = useCallback(() => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (open) {
      clearExitTimer();
      setMounted(true);
      setClosing(false);
      return;
    }

    if (!mounted) return;

    setClosing(true);
    exitTimerRef.current = setTimeout(() => {
      setMounted(false);
      setClosing(false);
      exitTimerRef.current = null;
    }, EXIT_FALLBACK_MS);

    return clearExitTimer;
  }, [clearExitTimer, mounted, open]);

  const finishExit = useCallback(() => {
    if (!closing) return;
    clearExitTimer();
    setMounted(false);
    setClosing(false);
  }, [clearExitTimer, closing]);

  return { mounted, closing, finishExit };
}
