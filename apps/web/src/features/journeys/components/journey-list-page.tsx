'use client';

import { SavedViewBar } from '@/components/ui/saved-view-bar';
import { useListParams } from '@/hooks/use-list-params';
import { useJourneys } from '../services/journey-queries';
import { JourneyDrawer } from './journey-drawer';
import { JourneyTable } from './journey-table';

const views = [
  ['all', 'Tất cả'], ['active', 'Đang cung ứng'], ['on-hold', 'Tạm dừng'], ['at-risk', 'Có rủi ro'], ['waiting-candidate', 'Chờ ứng viên'], ['waiting-external', 'Chờ đối tác'], ['completed', 'Đã hoàn tất']
] as const;

export function JourneyListPage() {
  const { params, setQuery, setView, setSelectedId } = useListParams({ defaultView: 'all' });
  const view = views.some(([id]) => id === params.view) ? params.view : 'all';
  const query = useJourneys({ query: params.query, view });
  return <div className="space-y-6"><div><p className="text-sm font-medium text-accent">Sau khi trúng tuyển</p><h1 className="mt-1 text-2xl font-bold text-text">Lộ trình cung ứng</h1><p className="mt-2 max-w-3xl text-sm text-text-muted">Theo dõi các mốc cung ứng nhân sự sang Nhật từ xác nhận nhận việc đến doanh nghiệp tiếp nhận. Thông tin xuất cảnh chỉ là một mốc tùy chọn.</p></div><SavedViewBar><label className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text">Tìm trong lộ trình<input aria-label="Tìm lộ trình" value={params.query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên ứng viên, mã đơn, khách hàng" className="min-h-10 w-80 rounded-control border border-border bg-panel px-3 font-normal" /></label><span className="text-sm text-text-muted">Dữ liệu theo phạm vi quyền hiện tại</span></SavedViewBar><div className="flex flex-wrap gap-2" role="tablist" aria-label="Các view lộ trình">{views.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`min-h-10 rounded-control border px-3 text-sm font-semibold ${view === id ? 'border-accent bg-accent text-white' : 'border-border bg-panel text-text-muted hover:text-text'}`}>{label}</button>)}</div><JourneyTable journeys={query.data?.items ?? []} isLoading={query.isPending} error={query.error ? 'Không thể tải danh sách lộ trình.' : undefined} onRetry={() => void query.refetch()} onRowClick={(journey) => setSelectedId(journey.id)} /><JourneyDrawer journeyId={params.selectedId} open={Boolean(params.selectedId)} onClose={() => setSelectedId(undefined)} /></div>;
}
