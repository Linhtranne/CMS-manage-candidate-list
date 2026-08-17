'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SavedViewBar } from '@/components/ui/saved-view-bar';
import { useListParams } from '@/hooks/use-list-params';
import { useCandidates, type CandidateView } from '../services/candidate-queries';
import { CandidateDrawer } from './candidate-drawer';
import { CandidateTable } from './candidate-table';
import { CreateCandidateModal } from './create-candidate-modal';
import { DuplicateReviewModal } from './duplicate-review-modal';
import { ImportCandidatesModal } from './import-candidates-modal';

const views = [
  ['potential', 'Ứng viên tiềm năng'],
  ['applying', 'Đang ứng tuyển'],
  ['passed', 'Đã trúng tuyển'],
  ['supplying', 'Đang cung ứng'],
  ['supplied', 'Đã cung ứng'],
  ['all', 'Tất cả'],
  ['missing-contact', 'Thiếu thông tin liên hệ'],
  ['duplicates', 'Nghi trùng']
] as const;

const industries = ['all', 'Công nghệ thông tin', 'Điều dưỡng', 'Cơ khí chế tạo', 'Sản xuất', 'Dịch vụ lưu trú'];
const readinessOptions = [['all', 'Tất cả'], ['NOT_READY', 'Chưa đủ hồ sơ'], ['READY_FOR_REVIEW', 'Chờ rà soát'], ['READY_FOR_INTERVIEW', 'Sẵn sàng phỏng vấn']];
const contactabilityOptions = [['all', 'Tất cả'], ['CONTACTABLE', 'Có thể liên hệ'], ['UNKNOWN', 'Chưa xác minh'], ['DO_NOT_CONTACT', 'Không liên hệ']];

export function CandidateListPage({ initialView = 'potential' }: { initialView?: CandidateView }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const { params, setQuery, setView, setSort, setSelectedId } = useListParams({ defaultView: initialView });
  const view = (views.some(([id]) => id === params.view) ? params.view : initialView) as CandidateView;
  const [industry = 'all', readiness = 'all', contactability = 'all'] = params.sort.split('|');
  const query = useCandidates({
    query: params.query,
    view,
    industry: industry === 'all' ? undefined : industry,
    readiness: readiness === 'all' ? undefined : readiness,
    contactability: contactability === 'all' ? undefined : contactability
  });
  const updateFilters = (next: { industry?: string; readiness?: string; contactability?: string }) => {
    setSort([next.industry ?? industry, next.readiness ?? readiness, next.contactability ?? contactability].join('|'));
  };
  const viewLabel = views.find(([id]) => id === view)?.[1] ?? 'Ứng viên';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-accent">Danh sách hồ sơ gốc</p>
          <h1 className="mt-1 text-2xl font-bold text-text">Ứng viên</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-muted">Quản lý hồ sơ ứng viên đa ngành, theo dõi trạng thái liên hệ và phase cung ứng mà không nhân bản dữ liệu ở đơn tuyển.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => setImportOpen(true)}>Import ứng viên</Button>
          <Button onClick={() => setDuplicateOpen(true)}>Rà soát nghi trùng</Button>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>Thêm ứng viên</Button>
        </div>
      </div>
      <section className="rounded-lg border border-border bg-panel p-4"><p className="text-sm font-semibold text-text">{viewLabel}</p><p className="mt-1 text-sm text-text-muted">Danh sách được giới hạn theo quyền và bộ lọc hiện tại.</p></section>
      <SavedViewBar>
        <label className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text">Tìm ứng viên<input aria-label="Tìm ứng viên" value={params.query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã, ngành nghề, nghề nghiệp" className="min-h-10 w-80 rounded-control border border-border bg-panel px-3 font-normal" /></label>
        <label className="flex items-center gap-2 text-sm text-text-muted">Ngành<select aria-label="Ngành ứng viên" value={industry} onChange={(event) => updateFilters({ industry: event.target.value })} className="min-h-10 rounded-control border border-border bg-panel px-3">{industries.map((item) => <option key={item} value={item}>{item === 'all' ? 'Tất cả ngành' : item}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm text-text-muted">Hồ sơ<select aria-label="Mức sẵn sàng hồ sơ" value={readiness} onChange={(event) => updateFilters({ readiness: event.target.value })} className="min-h-10 rounded-control border border-border bg-panel px-3">{readinessOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm text-text-muted">Liên hệ<select aria-label="Trạng thái liên hệ ứng viên" value={contactability} onChange={(event) => updateFilters({ contactability: event.target.value })} className="min-h-10 rounded-control border border-border bg-panel px-3">{contactabilityOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      </SavedViewBar>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Các view ứng viên">{views.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`min-h-10 rounded-control border px-3 text-sm font-semibold ${view === id ? 'border-accent bg-accent text-white' : 'border-border bg-panel text-text-muted hover:text-text'}`}>{label}</button>)}</div>
      <CandidateTable candidates={query.data?.items ?? []} isLoading={query.isPending} error={query.error ? 'Không thể tải danh sách ứng viên.' : undefined} onRetry={() => void query.refetch()} onRowClick={(candidate) => setSelectedId(candidate.id)} />
      <CandidateDrawer candidateId={params.selectedId} open={Boolean(params.selectedId)} onClose={() => setSelectedId(undefined)} />
      <CreateCandidateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ImportCandidatesModal open={importOpen} onClose={() => setImportOpen(false)} />
      <DuplicateReviewModal open={duplicateOpen} onClose={() => setDuplicateOpen(false)} />
    </div>
  );
}
