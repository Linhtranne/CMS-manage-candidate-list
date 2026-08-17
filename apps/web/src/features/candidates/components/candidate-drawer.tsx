'use client';

import { DetailDrawer } from '@/components/ui/detail-drawer';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Button } from '@/components/ui/button';
import { StatusLabel } from '@/components/ui/status-label';
import { useCandidate } from '../services/candidate-queries';
import { candidatePhaseLabel } from './candidate-table';

export function CandidateDrawer({ candidateId, open, onClose }: { candidateId?: string; open: boolean; onClose: () => void }) {
  const query = useCandidate(candidateId);
  const candidate = query.data;

  return (
    <DetailDrawer open={open} title="Hồ sơ ứng viên" size="wide" onClose={onClose}>
      {query.isPending ? <LoadingState /> : query.error || !candidate ? <ErrorState message="Không thể tải hồ sơ ứng viên." onRetry={() => void query.refetch()} /> : (
        <div className="space-y-6">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="text-sm font-semibold text-accent">{candidate.code}</p>
              <h3 className="mt-1 text-2xl font-bold text-text">{candidate.name}</h3>
              <p className="mt-2 text-sm text-text-muted">{candidate.occupation} · {candidate.industryLabels.join(', ')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusLabel tone="info">{candidatePhaseLabel(candidate.operationalPhase)}</StatusLabel>
                <StatusLabel tone={candidate.contactabilityStatus === 'CONTACTABLE' ? 'success' : 'warning'}>{candidate.contactabilityStatus === 'CONTACTABLE' ? 'Có thể liên hệ' : candidate.contactabilityStatus === 'DO_NOT_CONTACT' ? 'Không liên hệ' : 'Chưa xác minh liên hệ'}</StatusLabel>
              </div>
            </div>
            <div className="text-right text-sm text-text-muted"><p>Phụ trách</p><p className="mt-1 font-semibold text-text">{candidate.owner.name}</p></div>
          </header>
          <section className="flex flex-wrap gap-2" aria-label="Thao tác hồ sơ ứng viên">
            <Button variant="secondary" disabled title="Sẽ kết nối với hộp thư chung">Gửi email</Button>
            <Button variant="secondary" disabled title="Sẽ kết nối với đơn tuyển">Thêm vào đơn</Button>
            <Button variant="secondary" disabled title="Sẽ kết nối với hàng đợi công việc">Tạo việc</Button>
            <a href={`/candidates/${candidate.id}`} className="inline-flex min-h-10 items-center justify-center rounded-control bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1e4e8d] focus-visible:outline-none">Mở hồ sơ đầy đủ</a>
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-border bg-panel p-5"><h4 className="font-bold text-text">Thông tin liên hệ</h4><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-text-muted">Email</dt><dd className="mt-1 font-semibold text-text">{candidate.email ?? candidate.emailMasked ?? 'Chưa cập nhật'}</dd></div><div><dt className="text-sm text-text-muted">Điện thoại</dt><dd className="mt-1 font-semibold text-text">{candidate.phone ?? candidate.phoneMasked ?? 'Chưa cập nhật'}</dd></div><div><dt className="text-sm text-text-muted">Tiếng Nhật</dt><dd className="mt-1 font-semibold text-text">{candidate.japaneseLevel}</dd></div><div><dt className="text-sm text-text-muted">Nguồn hồ sơ</dt><dd className="mt-1 font-semibold text-text">{candidate.source}</dd></div></dl></section>
            <section className="rounded-lg border border-border bg-panel p-5"><h4 className="font-bold text-text">Tình hình xử lý</h4><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-text-muted">Số đơn ứng tuyển</dt><dd className="mt-1 text-2xl font-bold text-text">{candidate.applicationCount}</dd></div><div><dt className="text-sm text-text-muted">Email đã lưu vết</dt><dd className="mt-1 text-2xl font-bold text-text">{candidate.emailCount}</dd></div><div className="sm:col-span-2"><dt className="text-sm text-text-muted">Việc tiếp theo</dt><dd className="mt-1 font-semibold text-accent">{candidate.nextAction}</dd></div></dl></section>
          </div>
          <section className="rounded-lg border border-border bg-panel p-5"><h4 className="font-bold text-text">Ngành nghề và kỹ năng</h4><div className="mt-4 space-y-3">{candidate.occupationProfiles.map((profile) => <div key={`${profile.industryLabel}-${profile.occupation}`} className="rounded-control border border-border bg-surface p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-text">{profile.occupation}</p><StatusLabel tone={profile.status === 'PRIMARY' ? 'info' : 'neutral'}>{profile.industryLabel}</StatusLabel></div><p className="mt-1 text-sm text-text-muted">{profile.yearsExperience} năm kinh nghiệm · {profile.skills.join(', ') || 'Chưa cập nhật kỹ năng'}</p></div>)}</div></section>
          <p className="text-sm text-text-muted">Hồ sơ này là bản tóm tắt để thao tác nhanh. Các tab đầy đủ về ứng tuyển, lộ trình, email, tệp và lịch sử nằm trong hồ sơ chi tiết.</p>
        </div>
      )}
    </DetailDrawer>
  );
}
