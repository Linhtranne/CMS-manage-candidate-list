'use client';

import { Button } from '@/components/ui/button';
import { SavedViewBar } from '@/components/ui/saved-view-bar';
import { useListParams } from '@/hooks/use-list-params';
import { useApplications } from '../services/application-queries';
import { ApplicationDrawer } from './application-drawer';
import { ApplicationTable } from './application-table';

const views = [
  ['screening', 'Sàng lọc mới'],
  ['waiting-interview', 'Chờ phỏng vấn'],
  ['interviewed', 'Đã phỏng vấn'],
  ['waiting-result', 'Chờ kết quả'],
  ['passed', 'Đã trúng tuyển'],
  ['closed', 'Đã kết thúc'],
  ['overdue', 'Quá hạn']
] as const;
type ApplicationView = (typeof views)[number][0];

export function ApplicationListPage() {
  const { params, setQuery, setView, setSelectedId } = useListParams({ defaultView: 'screening' });
  const view = (views.some(([id]) => id === params.view) ? params.view : 'screening') as ApplicationView;
  const query = useApplications({ query: params.query, view });
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-accent">Pipeline xử lý nội bộ</p><h1 className="mt-1 text-2xl font-bold text-text">Ứng tuyển & Phỏng vấn</h1><p className="mt-2 max-w-3xl text-sm text-text-muted">Theo dõi đơn ứng tuyển theo giai đoạn suy ra từ lịch phỏng vấn, kết quả và quyết định; không tách rời khỏi đơn tuyển và khách hàng.</p></div><Button variant="primary">Thêm ứng viên</Button></div><SavedViewBar><label className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text">Tìm trong hồ sơ<input aria-label="Tìm ứng tuyển" value={params.query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã ứng viên, đơn tuyển, khách hàng" className="min-h-10 w-80 rounded-control border border-border bg-panel px-3 font-normal" /></label><label className="flex items-center gap-2 text-sm text-text-muted">Giai đoạn<select aria-label="Giai đoạn ứng tuyển" value={view} onChange={(event) => setView(event.target.value)} className="min-h-10 rounded-control border border-border bg-panel px-3">{views.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></SavedViewBar><div className="flex flex-wrap gap-2" role="tablist" aria-label="Các view ứng tuyển">{views.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`min-h-10 rounded-control border px-3 text-sm font-semibold ${view === id ? 'border-accent bg-accent text-white' : 'border-border bg-panel text-text-muted hover:text-text'}`}>{label}</button>)}</div><ApplicationTable applications={query.data?.items ?? []} isLoading={query.isPending} error={query.error ? 'Không thể tải danh sách ứng tuyển.' : undefined} onRetry={() => void query.refetch()} onRowClick={(application) => setSelectedId(application.id)} /><ApplicationDrawer applicationId={params.selectedId} open={Boolean(params.selectedId)} onClose={() => setSelectedId(undefined)} /></div>;
}
