'use client';

import { useCallback, useEffect, useState } from 'react';

export type ListParams = {
  query: string;
  view: string;
  sort: string;
  cursor?: string;
  selectedId?: string;
  journeyId?: string;
};

function readParams(defaultView: string): ListParams {
  const search = new URLSearchParams(window.location.search);
  return {
    query: search.get('query') ?? '',
    view: search.get('view') ?? defaultView,
    sort: search.get('sort') ?? '',
    cursor: search.get('cursor') ?? undefined,
    selectedId: search.get('selectedId') ?? undefined,
    journeyId: search.get('journeyId') ?? undefined
  };
}

export function useListParams({ defaultView }: { defaultView: string }) {
  const [params, setParams] = useState<ListParams>(() => readParams(defaultView));

  useEffect(() => {
    const syncFromUrl = () => setParams(readParams(defaultView));
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [defaultView]);

  const update = useCallback((patch: Partial<ListParams>) => {
    const next = { ...params, ...patch };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(next) as [string, string | undefined][]) {
      if (value) search.set(key, value);
    }
    const query = search.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    setParams(next);
  }, [params]);

  return {
    params,
    setQuery: (query: string) => update({ query, cursor: undefined }),
    setView: (view: string) => update({ view, cursor: undefined }),
    setSort: (sort: string) => update({ sort, cursor: undefined }),
    setCursor: (cursor?: string) => update({ cursor }),
    setSelectedId: (selectedId?: string) => update({ selectedId })
  };
}
