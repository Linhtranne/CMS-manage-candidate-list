'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Route } from 'next';
import type { components } from '@cms/contracts';
import { apiClient } from '@/lib/api/client';
import type { CurrentUser } from '@/lib/auth/types';
import { useI18n } from '@/i18n/use-i18n';

type SearchResult = components['schemas']['SearchResult'];

const resultsId = 'global-search-results';

export function GlobalSearch({ user: _user }: { user: CurrentUser }) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [value, setValue] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const handle = window.setTimeout(() => setQuery(value.trim()), 200);
    return () => window.clearTimeout(handle);
  }, [value]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const search = useQuery({
    queryKey: ['workspace-search', query],
    queryFn: async () => {
      const response = await apiClient.GET('/search', { params: { query: { q: query } } });
      if (response.error) throw new Error(response.error.message);
      return response.data.items;
    },
    enabled: query.length >= 2
  });
  const results = search.data ?? [];
  const activeResult = results[activeIndex];
  const showResults = open && query.length >= 2;

  useEffect(() => {
    setActiveIndex(-1);
  }, [query, results.length]);

  const closeResults = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeResults();
      return;
    }
    if (results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current + 1) % results.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
      return;
    }
    if (event.key === 'Enter' && activeResult) {
      event.preventDefault();
      closeResults();
      optionRefs.current[activeIndex]?.click();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <label className="sr-only" htmlFor="global-search">{t('common.search.label')}</label>
      <input
        id="global-search"
        name="global-search"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-label={t('common.search.label')}
        aria-autocomplete="list"
        aria-controls={resultsId}
        aria-expanded={showResults}
        aria-activedescendant={activeIndex >= 0 ? `global-search-option-${activeIndex}` : undefined}
        value={value}
        onFocus={() => { if (query.length >= 2) setOpen(true); }}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          const nextValue = event.target.value;
          setValue(nextValue);
          setOpen(nextValue.trim().length >= 2);
        }}
        placeholder={t('common.search.placeholder')}
        className="min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text outline-none placeholder:text-text-muted focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      />
      {showResults ? (
        <div id={resultsId} role="listbox" aria-label={t('common.search.results')} aria-busy={search.isPending} className="absolute left-0 right-0 top-12 z-20 rounded-lg border border-border bg-panel p-2 shadow-panel">
          {search.isPending ? <p className="px-3 py-2 text-sm text-text-muted">{t('common.search.loading')}</p> : null}
          {search.data?.length === 0 ? <p className="px-3 py-2 text-sm text-text-muted">{t('common.search.empty')}</p> : null}
          {results.map((result, index) => (
            <GlobalSearchResult
              key={result.id}
              result={result}
              index={index}
              active={index === activeIndex}
              anchorRef={(element) => { optionRefs.current[index] = element; }}
              onActivate={setActiveIndex}
              onSelect={closeResults}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GlobalSearchResult({ result, index, active, anchorRef, onActivate, onSelect }: { result: SearchResult; index: number; active: boolean; anchorRef: (element: HTMLAnchorElement | null) => void; onActivate: (index: number) => void; onSelect: () => void }) {
  return (
    <Link
      ref={anchorRef}
      id={`global-search-option-${index}`}
      role="option"
      aria-selected={active}
      href={result.href as Route}
      onPointerMove={() => onActivate(index)}
      onFocus={() => onActivate(index)}
      onClick={onSelect}
      className={`block rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${active ? 'bg-surface' : 'hover:bg-surface'}`}
    >
      <span className="block text-sm font-semibold text-text">{result.primaryText}</span>
      <span className="block text-xs text-text-muted">{result.typeLabel}{result.secondaryText ? ` · ${result.secondaryText}` : ''}</span>
    </Link>
  );
}
