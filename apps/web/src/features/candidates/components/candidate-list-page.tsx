'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SavedViewBar } from '@/components/ui/saved-view-bar';
import { SavedViewMenu } from '@/components/ui/saved-view-menu';
import { useCurrentUser } from '@/lib/auth/use-current-user';
import { useListParams } from '@/hooks/use-list-params';
import { useTabKeyboard } from '@/hooks/use-tab-keyboard';
import { useCandidates, type CandidateView } from '../services/candidate-queries';
import { CandidateDrawer } from './candidate-drawer';
import { CandidateTable } from './candidate-table';
import { CreateCandidateModal } from './create-candidate-modal';
import { AddApplicationDialog } from '@/features/applications/components/add-application-dialog';
import { DuplicateReviewModal } from './duplicate-review-modal';
import { ImportCandidatesModal } from './import-candidates-modal';

const views = [
  ['all', 'Tất cả'],
  ['potential', 'Ứng viên tiềm năng'],
  ['new-unassigned', 'Mới / chưa phân công'],
  ['ready-to-match', 'Sẵn sàng ghép đơn'],
  ['applying', 'Đang ứng tuyển'],
  ['passed', 'Đã trúng tuyển'],
  ['supplying', 'Đang cung ứng'],
  ['supplied', 'Đã cung ứng'],
  ['paused', 'Tạm dừng'],
  ['archived', 'Đã lưu trữ'],
  ['missing-contact', 'Thiếu thông tin liên hệ'],
  ['missing-documents', 'Thiếu hồ sơ / tài liệu'],
  ['duplicates', 'Nghi trùng']
] as const;

const industries = ['all', 'Công nghệ thông tin', 'Điều dưỡng', 'Cơ khí chế tạo', 'Sản xuất', 'Dịch vụ lưu trú'];
const readinessOptions = [['all', 'Tất cả'], ['NOT_READY', 'Chưa đủ hồ sơ'], ['READY_FOR_REVIEW', 'Chờ rà soát'], ['READY_FOR_INTERVIEW', 'Sẵn sàng phỏng vấn']];
const contactabilityOptions = [['all', 'Tất cả'], ['CONTACTABLE', 'Có thể liên hệ'], ['UNKNOWN', 'Chưa xác minh'], ['DO_NOT_CONTACT', 'Không liên hệ']];
const japaneseOptions = [['all', 'Tất cả'], ['N2', 'N2'], ['N3', 'N3'], ['N4', 'N4']];
const ownerOptions = [['all', 'Tất cả'], ['u-recruiter', 'Nguyễn Minh Anh'], ['u-manager', 'Lê Thu Hà'], ['u-coordinator', 'Trần Quốc Huy']];
const recordOptions = [['all', 'Đang hoạt động'], ['ARCHIVED', 'Đã lưu trữ']];
const experienceOptions = [['all', 'Tất cả'], ['0-2', '0–2 năm'], ['3-5', '3–5 năm'], ['6+', 'Từ 6 năm']];

export function CandidateListPage({ initialView = 'potential' }: { initialView?: CandidateView }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [candidateForOrder, setCandidateForOrder] = useState<string>();
  const currentUser = useCurrentUser();
  const { params, setQuery, setView, setSort, setSelectedId } = useListParams({ defaultView: initialView });
  const view = (views.some(([id]) => id === params.view) ? params.view : initialView) as CandidateView;
  const handleTabKeyDown = useTabKeyboard(views.map(([id]) => id), setView);
  const [industry = 'all', readiness = 'all', contactability = 'all', japaneseLevel = 'all', ownerId = 'all', recordStatus = 'all', occupation = '', skill = '', desiredLocation = '', source = '', experience = 'all'] = params.sort.split('|');
  const query = useCandidates({
    query: params.query,
    view,
    industry: industry === 'all' ? undefined : industry,
    readiness: readiness === 'all' ? undefined : readiness,
    contactability: contactability === 'all' ? undefined : contactability,
    occupation: occupation || undefined,
    skill: skill || undefined,
    desiredLocation: desiredLocation || undefined,
    source: source || undefined,
    recordStatus: recordStatus === 'all' ? undefined : recordStatus,
    experience: experience === 'all' ? undefined : experience
  });
  const updateFilters = (next: { industry?: string; readiness?: string; contactability?: string; japaneseLevel?: string; ownerId?: string; recordStatus?: string; occupation?: string; skill?: string; desiredLocation?: string; source?: string; experience?: string }) => {
    setSort([next.industry ?? industry, next.readiness ?? readiness, next.contactability ?? contactability, next.japaneseLevel ?? japaneseLevel, next.ownerId ?? ownerId, next.recordStatus ?? recordStatus, next.occupation ?? occupation, next.skill ?? skill, next.desiredLocation ?? desiredLocation, next.source ?? source, next.experience ?? experience].join('|'));
  };
  const viewLabel = views.find(([id]) => id === view)?.[1] ?? 'Ứng viên';
  const filteredCandidates = (query.data?.items ?? []).filter((candidate) => (japaneseLevel === 'all' || candidate.japaneseLevel === japaneseLevel) && (ownerId === 'all' || candidate.owner.id === ownerId) && (view === 'archived' ? candidate.recordStatus === 'ARCHIVED' : recordStatus === 'all' ? candidate.recordStatus === 'ACTIVE' : candidate.recordStatus === recordStatus));

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
        <label className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm font-semibold text-text">Tìm ứng viên<input name="candidate-search" aria-label="Tìm ứng viên" value={params.query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã, ngành nghề, nghề nghiệp" className="min-h-10 min-w-0 flex-1 rounded-control border border-border bg-panel px-3 font-normal sm:w-80 sm:flex-none" /></label>
        <label className="flex items-center gap-2 text-sm text-text-muted">Ngành<select aria-label="Ngành ứng viên" name="nganh-ung-vien" value={industry} onChange={(event) => updateFilters({ industry: event.target.value })} className="min-h-10 rounded-control border border-border bg-panel px-3">{industries.map((item) => <option key={item} value={item}>{item === 'all' ? 'Tất cả ngành' : item}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm text-text-muted">Hồ sơ<select aria-label="Mức sẵn sàng hồ sơ" name="muc-san-sang-ho-so" value={readiness} onChange={(event) => updateFilters({ readiness: event.target.value })} className="min-h-10 rounded-control border border-border bg-panel px-3">{readinessOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm text-text-muted">Liên hệ<select aria-label="Trạng thái liên hệ ứng viên" name="trang-thai-lien-he-ung-vien" value={contactability} onChange={(event) => updateFilters({ contactability: event.target.value })} className="min-h-10 rounded-control border border-border bg-panel px-3">{contactabilityOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm text-text-muted">Tiếng Nhật<select aria-label="Trình độ tiếng Nhật" name="trinh-do-tieng-nhat" value={japaneseLevel} onChange={(event) => updateFilters({ japaneseLevel: event.target.value })} className="min-h-10 rounded-control border border-border bg-panel px-3">{japaneseOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm text-text-muted">Phụ trách<select aria-label="Người phụ trách ứng viên" name="nguoi-phu-trach-ung-vien" value={ownerId} onChange={(event) => updateFilters({ ownerId: event.target.value })} className="min-h-10 rounded-control border border-border bg-panel px-3">{ownerOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm text-text-muted">Lưu trữ<select aria-label="Trạng thái lưu trữ ứng viên" name="trang-thai-luu-tru-ung-vien" value={recordStatus} onChange={(event) => updateFilters({ recordStatus: event.target.value })} className="min-h-10 rounded-control border border-border bg-panel px-3">{recordOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm text-text-muted">Kinh nghiệm<select aria-label="Số năm kinh nghiệm" name="so-nam-kinh-nghiem" value={experience} onChange={(event) => updateFilters({ experience: event.target.value })} className="min-h-10 rounded-control border border-border bg-panel px-3">{experienceOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm text-text-muted">Nghề<input aria-label="Lọc theo nghề nghiệp" name="loc-theo-nghe-nghiep" value={occupation} onChange={(event) => updateFilters({ occupation: event.target.value })} placeholder="Ví dụ: kỹ sư…" className="min-h-10 w-40 rounded-control border border-border bg-panel px-3 font-normal" /></label>
        <label className="flex items-center gap-2 text-sm text-text-muted">Kỹ năng<input aria-label="Lọc theo kỹ năng" name="loc-theo-ky-nang" value={skill} onChange={(event) => updateFilters({ skill: event.target.value })} placeholder="Ví dụ: React…" className="min-h-10 w-40 rounded-control border border-border bg-panel px-3 font-normal" /></label>
        <label className="flex items-center gap-2 text-sm text-text-muted">Khu vực<input aria-label="Lọc theo khu vực mong muốn" name="loc-theo-khu-vuc-mong-muon" value={desiredLocation} onChange={(event) => updateFilters({ desiredLocation: event.target.value })} placeholder="Tokyo…" className="min-h-10 w-32 rounded-control border border-border bg-panel px-3 font-normal" /></label>
        <label className="flex items-center gap-2 text-sm text-text-muted">Nguồn<input aria-label="Lọc theo nguồn hồ sơ" name="loc-theo-nguon-ho-so" value={source} onChange={(event) => updateFilters({ source: event.target.value })} placeholder="Nguồn…" className="min-h-10 w-32 rounded-control border border-border bg-panel px-3 font-normal" /></label>
        {currentUser.data ? <SavedViewMenu resource="candidates" user={currentUser.data} query={{ view, query: params.query, industry, readiness, contactability, japaneseLevel, ownerId, recordStatus, occupation, skill, desiredLocation, source, experience }} onApply={(saved) => {
          if (typeof saved.view === 'string') setView(saved.view);
          if (typeof saved.query === 'string') setQuery(saved.query);
          if (typeof saved.industry === 'string' && typeof saved.readiness === 'string' && typeof saved.contactability === 'string') setSort([saved.industry, saved.readiness, saved.contactability, typeof saved.japaneseLevel === 'string' ? saved.japaneseLevel : 'all', typeof saved.ownerId === 'string' ? saved.ownerId : 'all', typeof saved.recordStatus === 'string' ? saved.recordStatus : 'all', typeof saved.occupation === 'string' ? saved.occupation : '', typeof saved.skill === 'string' ? saved.skill : '', typeof saved.desiredLocation === 'string' ? saved.desiredLocation : '', typeof saved.source === 'string' ? saved.source : '', typeof saved.experience === 'string' ? saved.experience : 'all'].join('|'));
        }} /> : null}
      </SavedViewBar>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Các view ứng viên" onKeyDown={handleTabKeyDown}>{views.map(([id, label]) => <button key={id} type="button" role="tab" data-tab-value={id} tabIndex={view === id ? 0 : -1} aria-selected={view === id} onClick={() => setView(id)} className={`min-h-10 rounded-control border px-3 text-sm font-semibold ${view === id ? 'border-accent bg-accent text-white' : 'border-border bg-panel text-text-muted hover:text-text'}`}>{label}</button>)}</div>
      <CandidateTable candidates={filteredCandidates} isLoading={query.isPending} error={query.error ? 'Không thể tải danh sách ứng viên.' : undefined} onRetry={() => void query.refetch()} onRowClick={(candidate) => setSelectedId(candidate.id)} />
      <CandidateDrawer candidateId={params.selectedId} open={Boolean(params.selectedId)} onClose={() => setSelectedId(undefined)} onAddToOrder={(candidateId) => { setSelectedId(undefined); setCandidateForOrder(candidateId); }} />
      <AddApplicationDialog open={Boolean(candidateForOrder)} initialCandidateId={candidateForOrder} onClose={() => setCandidateForOrder(undefined)} />
      <CreateCandidateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ImportCandidatesModal open={importOpen} onClose={() => setImportOpen(false)} />
      <DuplicateReviewModal open={duplicateOpen} onClose={() => setDuplicateOpen(false)} />
    </div>
  );
}
