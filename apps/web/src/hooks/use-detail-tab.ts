'use client';

import { useCallback, useEffect, useState } from 'react';

export function useDetailTab<T extends string>(defaultTab: T): [T, (tab: T) => void] {
  const read = useCallback(() => (new URLSearchParams(window.location.search).get('tab') as T | null) ?? defaultTab, [defaultTab]);
  const [tab, setTab] = useState<T>(() => read());

  useEffect(() => {
    const onPopState = () => setTab(read());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [read]);

  const update = (next: T) => {
    const search = new URLSearchParams(window.location.search);
    search.set('tab', next);
    window.history.replaceState({}, '', `${window.location.pathname}?${search.toString()}`);
    setTab(next);
  };

  return [tab, update];
}
