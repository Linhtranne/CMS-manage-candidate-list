'use client';

import { useState } from 'react';

import { DetailDrawer } from '@/components/ui/detail-drawer';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Button, ButtonLink } from '@/components/ui/button';
import { StatusLabel } from '@/components/ui/status-label';
import { useCandidate } from '../services/candidate-queries';
import { candidatePhaseLabel } from './candidate-table';
import { CreateWorkDialog } from '@/features/work/components/create-work-dialog';

export function CandidateDrawer({ candidateId, open, onClose, onAddToOrder }: { candidateId?: string; open: boolean; onClose: () => void; onAddToOrder?: (candidateId: string) => void }) {
  const query = useCandidate(candidateId);
  const candidate = query.data;
  const [createWorkOpen, setCreateWorkOpen] = useState(false);

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
            <ButtonLink variant="secondary" href={`/mailbox?query=${encodeURIComponent(candidate.name)}`}>Gửi email</ButtonLink>
            <Button variant="secondary" onClick={() => onAddToOrder?.(candidate.id)}>Thêm vào đơn</Button>
            <Button variant="secondary" onClick={() => setCreateWorkOpen(true)}>Tạo việc</Button>
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-border bg-panel p-5"><h4 className="font-bold text-text">Thông tin liên hệ</h4><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-text-muted">Email</dt><dd className="mt-1 font-semibold text-text">{candidate.email ?? candidate.emailMasked ?? 'Chưa cập nhật'}</dd></div><div><dt className="text-sm text-text-muted">Điện thoại</dt><dd className="mt-1 font-semibold text-text">{candidate.phone ?? candidate.phoneMasked ?? 'Chưa cập nhật'}</dd></div><div><dt className="text-sm text-text-muted">Tiếng Nhật</dt><dd className="mt-1 font-semibold text-text">{candidate.japaneseLevel}</dd></div><div><dt className="text-sm text-text-muted">Nguồn hồ sơ</dt><dd className="mt-1 font-semibold text-text">{candidate.source}</dd></div></dl></section>
            <section className="rounded-lg border border-border bg-panel p-5"><h4 className="font-bold text-text">Tình hình xử lý</h4><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-text-muted">Số đơn ứng tuyển</dt><dd className="mt-1 text-2xl font-bold text-text">{candidate.applicationCount}</dd></div><div><dt className="text-sm text-text-muted">Email đã lưu vết</dt><dd className="mt-1 text-2xl font-bold text-text">{candidate.emailCount}</dd></div><div className="sm:col-span-2"><dt className="text-sm text-text-muted">Việc tiếp theo</dt><dd className="mt-1 font-semibold text-accent">{candidate.nextAction}</dd></div></dl></section>
          </div>
          <section className="rounded-lg border border-border bg-panel p-5"><h4 className="font-bold text-text">Ngành nghề và kỹ năng</h4><div className="mt-4 space-y-3">{candidate.occupationProfiles.map((profile) => <div key={`${profile.industryLabel}-${profile.occupation}`} className="rounded-control border border-border bg-surface p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-text">{profile.occupation}</p><StatusLabel tone={profile.status === 'PRIMARY' ? 'info' : 'neutral'}>{profile.industryLabel}</StatusLabel></div><p className="mt-1 text-sm text-text-muted">{profile.yearsExperience} năm kinh nghiệm · {profile.skills.join(', ') || 'Chưa cập nhật kỹ năng'}</p></div>)}</div></section>
          <p className="text-sm text-text-muted">Các thao tác và thông tin liên quan được hiển thị ngay trong lớp chi tiết này để bạn không mất ngữ cảnh danh sách.</p>
          <CreateWorkDialog candidate={candidate} open={createWorkOpen} onClose={() => setCreateWorkOpen(false)} />
        </div>
      )}
    </DetailDrawer>
  );
}
