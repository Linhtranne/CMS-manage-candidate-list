'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useCandidates, useReviewCandidateDuplicate } from '../services/candidate-queries';

export function DuplicateReviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const query = useCandidates({ view: 'duplicates' });
  const review = useReviewCandidateDuplicate();
  const [saved, setSaved] = useState(false);
  const candidate = query.data?.items[0];

  const markReviewed = () => {
    if (!candidate) return;
    review.mutate({ id: candidate.id, body: { action: 'MARK_REVIEWED', targetCandidateId: null, reason: 'Đã rà soát trong CMS', version: candidate.version } }, { onSuccess: () => setSaved(true) });
  };

  return (
    <Modal open={open} onClose={onClose} title="Rà soát ứng viên nghi trùng" description="Ghi nhận kết quả rà soát để danh sách tiềm năng không bị lặp hồ sơ." size="md" footer={saved ? <Button variant="primary" onClick={onClose}>Đóng</Button> : <><Button onClick={onClose}>Hủy</Button><Button variant="primary" onClick={markReviewed} disabled={!candidate || review.isPending}>{review.isPending ? 'Đang lưu...' : 'Đánh dấu đã rà soát'}</Button></>}>
      {saved ? <div className="rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success" role="status">Đã ghi nhận kết quả rà soát trùng</div> : <div className="space-y-4">
        {candidate ? <section className="rounded-control border border-border bg-surface p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-text">{candidate.code} · {candidate.name}</p><p className="mt-1 text-sm text-text-muted">{candidate.occupation} · {candidate.industryLabels.join(', ')}</p></div><span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">Nghi trùng</span></div><p className="mt-3 text-sm text-text-muted">Nguồn hồ sơ: {candidate.source} · Phụ trách: {candidate.owner.name}</p></section> : <p className="rounded-control border border-border bg-surface px-4 py-3 text-sm text-text-muted">Không còn hồ sơ đang chờ rà soát.</p>}
        <p className="text-xs text-text-muted">Hành động này chỉ ghi nhận trạng thái rà soát, không tự động xoá hoặc gộp hồ sơ.</p>
      </div>}
    </Modal>
  );
}
