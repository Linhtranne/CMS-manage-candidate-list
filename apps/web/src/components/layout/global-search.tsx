'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Route } from 'next';
import type { components } from '@cms/contracts';
import { apiClient } from '@/lib/api/client';
import type { CurrentUser } from '@/lib/auth/types';

type SearchResult = components['schemas']['SearchResult'];

export function GlobalSearch({ user: _user }: { user: CurrentUser }) {
  const [value, setValue] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => setQuery(value.trim()), 200);
    return () => window.clearTimeout(handle);
  }, [value]);

  const search = useQuery({
    queryKey: ['workspace-search', query],
    queryFn: async () => {
      const response = await apiClient.GET('/search', { params: { query: { q: query } } });
      if (response.error) throw new Error(response.error.message);
      return response.data.items;
    },
    enabled: query.length >= 2
  });

  return (
    <div className="relative w-full max-w-xl">
      <label className="sr-only" htmlFor="global-search">Tìm kiếm toàn hệ thống</label>
      <input
        id="global-search"
        role="combobox"
        aria-label="Tìm kiếm toàn hệ thống"
        aria-expanded={query.length >= 2}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Tìm ứng viên, khách hàng, đơn hàng"
        className="min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text outline-none placeholder:text-text-muted focus:border-accent"
      />
      {query.length >= 2 ? (
        <div className="absolute left-0 right-0 top-12 z-20 rounded-lg border border-border bg-panel p-2 shadow-panel">
          {search.isPending ? <p className="px-3 py-2 text-sm text-text-muted">Đang tìm kiếm</p> : null}
          {search.data?.length === 0 ? <p className="px-3 py-2 text-sm text-text-muted">Không tìm thấy kết quả</p> : null}
          {search.data?.map((result) => <GlobalSearchResult key={result.id} result={result} />)}
        </div>
      ) : null}
    </div>
  );
}

function GlobalSearchResult({ result }: { result: SearchResult }) {
  return (
    <Link href={result.href as Route} className="block rounded-md px-3 py-2 hover:bg-surface">
      <span className="block text-sm font-semibold text-text">{result.primaryText}</span>
      <span className="block text-xs text-text-muted">{result.typeLabel}{result.secondaryText ? ` · ${result.secondaryText}` : ''}</span>
    </Link>
  );
}
