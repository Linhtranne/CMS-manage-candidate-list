'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SavedViewBar } from '@/components/ui/saved-view-bar';
import { SavedViewMenu } from '@/components/ui/saved-view-menu';
import { useCurrentUser } from '@/lib/auth/use-current-user';
import { useListParams } from '@/hooks/use-list-params';
import { useI18n } from '@/i18n/use-i18n';
import { useWorkItems, useWorkSummary } from '../services/work-queries';
import { WorkDrawer } from './work-drawer';
import { WorkSummary } from './work-summary';
import { WorkTable } from './work-table';

export function WorkPage() {
  const { t } = useI18n();
  const { params, setView, setQuery } = useListParams({ defaultView: 'actionable' });
  const currentUser = useCurrentUser();
  const [selectedId, setSelectedId] = useState<string>();
  const summaryQuery = useWorkSummary(params.view);
  const itemsQuery = useWorkItems({ view: params.view, sort: params.sort || 'priority', query: params.query });
  const summary = summaryQuery.data ?? { overdue: 0, today: 0, waitingReply: 0, unresolvedEmail: 0, journeyRisk: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-accent">{t('work.eyebrow')}</p><h1 className="mt-1 text-2xl font-bold text-text">{t('work.title')}</h1><p className="mt-2 text-sm text-text-muted">{t('work.description')}</p></div><Link href="/candidates" className="inline-flex min-h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1f579e]">{t('work.openCandidates')}</Link></div>
      <WorkSummary summary={summary} activeView={params.view} onSelect={setView} />
      <SavedViewBar><div className="flex min-w-0 flex-1 flex-wrap items-center gap-2"><label htmlFor="work-search" className="text-sm font-semibold text-text">{t('work.searchLabel')}</label><input id="work-search" name="work-search" value={params.query} onChange={(event) => setQuery(event.target.value)} placeholder={t('work.searchPlaceholder')} className="min-h-10 min-w-0 flex-1 rounded-control border border-border bg-panel px-3 text-sm sm:w-72 sm:flex-none" /></div><label className="flex items-center gap-2 text-sm text-text-muted">{t('work.viewLabel')}<select aria-label={t('work.viewAria')} name="work-view" value={params.view} onChange={(event) => setView(event.target.value)} className="min-h-10 rounded-control border border-border bg-panel px-3 text-sm"><option value="actionable">{t('work.views.actionable')}</option><option value="today">{t('work.views.today')}</option><option value="seven-days">{t('work.views.sevenDays')}</option><option value="overdue">{t('work.views.overdue')}</option><option value="waiting-reply">{t('work.views.waitingReply')}</option><option value="assigned-to-me">{t('work.views.assignedToMe')}</option><option value="following">{t('work.views.following')}</option><option value="team">{t('work.views.team')}</option></select></label>{currentUser.data ? <SavedViewMenu resource="work" user={currentUser.data} query={{ view: params.view, query: params.query }} onApply={(saved) => { if (typeof saved.view === 'string') setView(saved.view); if (typeof saved.query === 'string') setQuery(saved.query); }} /> : null}</SavedViewBar>
      <WorkTable items={itemsQuery.data?.items ?? []} isLoading={itemsQuery.isPending} error={itemsQuery.error ? t('work.errors.queue') : undefined} onRetry={() => void itemsQuery.refetch()} onRowClick={(item) => { setSelectedId(item.id); window.history.replaceState({}, '', `${window.location.pathname}?${new URLSearchParams({ ...(params.query ? { query: params.query } : {}), view: params.view, selectedId: item.id }).toString()}`); }} />
      <WorkDrawer workItemId={selectedId} open={Boolean(selectedId)} onClose={() => { setSelectedId(undefined); const next = new URLSearchParams(window.location.search); next.delete('selectedId'); window.history.replaceState({}, '', `${window.location.pathname}${next.toString() ? `?${next.toString()}` : ''}`); }} />
    </div>
  );
}

