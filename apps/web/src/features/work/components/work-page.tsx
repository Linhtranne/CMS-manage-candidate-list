'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SavedViewBar } from '@/components/ui/saved-view-bar';
import { SavedViewMenu } from '@/components/ui/saved-view-menu';
import { useCurrentUser } from '@/lib/auth/use-current-user';
import { useListParams } from '@/hooks/use-list-params';
import { useWorkItems, useWorkSummary } from '../services/work-queries';
import { WorkDrawer } from './work-drawer';
import { WorkSummary } from './work-summary';
import { WorkTable } from './work-table';

export function WorkPage() {
  const { params, setView, setQuery } = useListParams({ defaultView: 'actionable' });
  const currentUser = useCurrentUser();
  const [selectedId, setSelectedId] = useState<string>();
  const summaryQuery = useWorkSummary(params.view);
  const itemsQuery = useWorkItems({ view: params.view, sort: params.sort || 'priority', query: params.query });
  const summary = summaryQuery.data ?? { overdue: 0, today: 0, waitingReply: 0, unresolvedEmail: 0, journeyRisk: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-accent">Hàng đợi xử lý</p><h1 className="mt-1 text-2xl font-bold text-text">Việc của tôi</h1><p className="mt-2 text-sm text-text-muted">Ưu tiên công việc theo hạn xử lý, SLA và bước nghiệp vụ tiếp theo.</p></div><Link href="/candidates" className="inline-flex min-h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1f579e]">Mở danh sách ứng viên</Link></div>
      <WorkSummary summary={summary} activeView={params.view} onSelect={setView} />
      <SavedViewBar><div className="flex min-w-0 flex-1 flex-wrap items-center gap-2"><label htmlFor="work-search" className="text-sm font-semibold text-text">Tìm trong việc</label><input id="work-search" name="work-search" value={params.query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên ứng viên, khách hàng, công việc" className="min-h-10 min-w-0 flex-1 rounded-control border border-border bg-panel px-3 text-sm sm:w-72 sm:flex-none" /></div><label className="flex items-center gap-2 text-sm text-text-muted">View<select aria-label="View công việc" name="view-cong-viec" value={params.view} onChange={(event) => setView(event.target.value)} className="min-h-10 rounded-control border border-border bg-panel px-3 text-sm"><option value="actionable">Cần xử lý</option><option value="today">Hôm nay</option><option value="seven-days">7 ngày tới</option><option value="overdue">Quá hạn</option><option value="waiting-reply">Chờ phản hồi</option><option value="assigned-to-me">Được giao cho tôi</option><option value="following">Tôi đang theo dõi</option><option value="team">Cả đội</option></select></label>{currentUser.data ? <SavedViewMenu resource="work" user={currentUser.data} query={{ view: params.view, query: params.query }} onApply={(saved) => { if (typeof saved.view === 'string') setView(saved.view); if (typeof saved.query === 'string') setQuery(saved.query); }} /> : null}</SavedViewBar>
      <WorkTable items={itemsQuery.data?.items ?? []} isLoading={itemsQuery.isPending} error={itemsQuery.error ? 'Không thể tải hàng đợi công việc.' : undefined} onRetry={() => void itemsQuery.refetch()} onRowClick={(item) => { setSelectedId(item.id); window.history.replaceState({}, '', `${window.location.pathname}?${new URLSearchParams({ ...(params.query ? { query: params.query } : {}), view: params.view, selectedId: item.id }).toString()}`); }} />
      <WorkDrawer workItemId={selectedId} open={Boolean(selectedId)} onClose={() => { setSelectedId(undefined); const next = new URLSearchParams(window.location.search); next.delete('selectedId'); window.history.replaceState({}, '', `${window.location.pathname}${next.toString() ? `?${next.toString()}` : ''}`); }} />
    </div>
  );
}

