'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useCandidates, useReviewCandidateDuplicate } from '../services/candidate-queries';

type ReviewAction = 'MARK_REVIEWED' | 'KEEP_SEPARATE' | 'MERGE';

export function DuplicateReviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const query = useCandidates({ view: 'duplicates' });
  const review = useReviewCandidateDuplicate();
  const [selectedId, setSelectedId] = useState<string>();
  const [targetId, setTargetId] = useState<string>();
  const [action, setAction] = useState<ReviewAction>('MARK_REVIEWED');
  const [reason, setReason] = useState('');
  const [saved, setSaved] = useState(false);
  const candidates = query.data?.items ?? [];
  const selected = candidates.find((candidate) => candidate.id === selectedId) ?? candidates[0];
  const targets = useMemo(() => candidates.filter((candidate) => candidate.id !== selected?.id), [candidates, selected?.id]);

  useEffect(() => {
    if (!selectedId && candidates[0]) setSelectedId(candidates[0].id);
    if (targetId && targetId === selected?.id) setTargetId(undefined);
  }, [candidates, selected?.id, selectedId, targetId]);

  const submit = () => {
    if (!selected) return;
    if (action === 'MERGE' && (!targetId || !reason.trim())) return;
    review.mutate({ id: selected.id, body: { action, targetCandidateId: action === 'MERGE' ? targetId : null, reason: reason.trim() || null, version: selected.version } }, { onSuccess: () => setSaved(true) });
  };

  return <Modal open={open} onClose={onClose} title="Rà soát ứng viên nghi trùng" description="Chọn kết quả rõ ràng; hệ thống không tự động xoá hoặc gộp hồ sơ." size="lg" footer={saved ? <Button variant="primary" onClick={onClose}>Đóng</Button> : <><Button onClick={onClose}>Hủy</Button><Button variant="primary" onClick={submit} disabled={!selected || review.isPending || (action === 'MERGE' && (!targetId || !reason.trim()))}>{review.isPending ? 'Đang lưu…' : action === 'MARK_REVIEWED' ? 'Đánh dấu đã rà soát' : 'Ghi nhận kết quả'}</Button></>}>
    {saved ? <div className="rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success" role="status"><p>Đã ghi nhận kết quả rà soát trùng</p><p className="mt-1 text-xs font-normal text-text-muted">Lịch sử ứng viên được giữ nguyên.</p></div> : <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="space-y-3"><div className="rounded-control border border-border bg-surface p-4"><p className="font-semibold text-text">Hồ sơ nghi trùng</p><div className="mt-3 space-y-2">{candidates.length ? candidates.map((candidate) => <button key={candidate.id} type="button" onClick={() => { setSelectedId(candidate.id); setTargetId(undefined); }} className={`block w-full rounded-control border px-3 py-3 text-left ${candidate.id === selected?.id ? 'border-accent bg-[#e8f1fb]' : 'border-border bg-panel hover:bg-surface'}`}><p className="font-semibold text-text">{candidate.code} · {candidate.name}</p><p className="mt-1 text-xs text-text-muted">{candidate.occupation} · {candidate.industryLabels.join(', ')}</p></button>) : <p className="text-sm text-text-muted">Không còn hồ sơ đang chờ rà soát.</p>}</div></div>{selected ? <div className="rounded-control border border-border bg-panel p-4"><p className="font-semibold text-text">Hồ sơ đang xử lý</p><p className="mt-2 text-sm text-text-muted">Nguồn: {selected.source} · Phụ trách: {selected.owner.name}</p><p className="mt-1 text-sm text-text-muted">Liên hệ: {selected.emailMasked ?? 'chưa có'} · {selected.phoneMasked ?? 'chưa có'}</p></div> : null}</section>
      <section className="space-y-4 rounded-control border border-border bg-panel p-4"><label className="block text-sm font-semibold text-text">Kết quả<select aria-label="Kết quả rà soát trùng" name="ket-qua-ra-soat-trung" value={action} onChange={(event) => { setAction(event.target.value as ReviewAction); setReason(''); }} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="MARK_REVIEWED">Đã rà soát</option><option value="KEEP_SEPARATE">Giữ riêng</option><option value="MERGE">Gộp vào hồ sơ khác</option></select></label>{action === 'MERGE' ? <label className="block text-sm font-semibold text-text">Hồ sơ đích<select aria-label="Hồ sơ đích để gộp" name="ho-so-dich-de-gop" value={targetId ?? ''} onChange={(event) => setTargetId(event.target.value || undefined)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">Chọn hồ sơ đích</option>{targets.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.code} · {candidate.name}</option>)}</select></label> : null}<label className="block text-sm font-semibold text-text">Lý do{action === 'MERGE' ? <span className="text-danger"> *</span> : null}<textarea aria-label="Lý do rà soát trùng" name="ly-do-ra-soat-trung" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do và căn cứ rà soát…" className="mt-1 min-h-28 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label><p className="text-xs text-text-muted">Gộp chỉ ghi nhận quyết định trong bản demo; dữ liệu đơn ứng tuyển, lộ trình, email và tệp không bị xoá.</p></section>
    </div>}
  </Modal>;
}
