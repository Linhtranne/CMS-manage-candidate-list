'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { Modal } from '@/components/ui/modal';
import { StatusLabel } from '@/components/ui/status-label';
import { useAddCandidatesToOrder, useClientsForOrder } from '../services/order-queries';
import { addCandidatesSchema } from '../schemas/add-candidates.schema';

export function AddCandidatesDialog({ orderId, open, onClose }: { orderId: string; open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const matches = useClientsForOrder({ orderId, query });
  const mutation = useAddCandidatesToOrder();

  const toggleCandidate = (candidateId: string) => {
    setSelected((current) => current.includes(candidateId) ? current.filter((id) => id !== candidateId) : [...current, candidateId]);
  };

  const submit = () => {
    const parsed = addCandidatesSchema.safeParse({ candidateIds: selected, source: 'MANUAL_MATCH' });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Chọn ứng viên'); return; }
    setError('');
    mutation.mutate({ orderId, body: parsed.data }, { onSuccess: onClose, onError: (cause) => setError(cause.message) });
  };

  return <Modal open={open} onClose={onClose} title="Thêm ứng viên vào đơn" description="Lọc minh bạch theo hồ sơ hiện có; không tự động xếp hạng bằng AI." size="lg" footer={<><Button variant="secondary" onClick={onClose}>Hủy</Button><Button variant="primary" onClick={submit} disabled={mutation.isPending}>Thêm vào đơn</Button></>}>
      <label className="mt-5 block text-sm font-semibold">Tìm ứng viên<input aria-label="Tìm ứng viên" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã, tên, nghề" className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label>
      {matches.isPending ? <div className="mt-4"><LoadingState /></div> : <div className="mt-4 overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[660px] text-left text-sm"><thead className="border-b border-border bg-surface text-xs uppercase tracking-wide text-text-muted"><tr><th className="px-3 py-3">Chọn</th><th className="px-3 py-3">Ứng viên</th><th className="px-3 py-3">Ngành / nghề</th><th className="px-3 py-3">Tiếng Nhật</th><th className="px-3 py-3">Sẵn sàng</th><th className="px-3 py-3">Lưu ý</th></tr></thead><tbody>{(matches.data?.items ?? []).map((candidate) => {
        const disabled = candidate.hasActiveApplicationInOrder;
        const isSelected = selected.includes(candidate.id);
        const selectFromRow = () => { if (!disabled) toggleCandidate(candidate.id); };
        return <tr key={candidate.id} aria-selected={isSelected} tabIndex={disabled ? undefined : 0} onClick={selectFromRow} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) { event.preventDefault(); selectFromRow(); } }} className={`border-b border-border last:border-0 ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-surface'}`}><td className="px-3 py-3"><input type="checkbox" aria-label={`Chọn ${candidate.name}`} checked={isSelected} disabled={disabled} onClick={(event) => event.stopPropagation()} onChange={() => toggleCandidate(candidate.id)} /></td><td className="px-3 py-3 font-semibold">{candidate.code} · {candidate.name}</td><td className="px-3 py-3">{candidate.industryLabel}<br /><span className="text-xs text-text-muted">{candidate.occupation}</span></td><td className="px-3 py-3">{candidate.japaneseLevel}</td><td className="px-3 py-3">{candidate.readiness}</td><td className="px-3 py-3">{disabled ? <StatusLabel tone="neutral">Đã trong đơn</StatusLabel> : candidate.hasActiveJourney ? <StatusLabel tone="warning">Đang có lộ trình cung ứng</StatusLabel> : <StatusLabel tone="success">Có thể chọn</StatusLabel>}</td></tr>;
      })}</tbody></table></div>}
      {error ? <p role="alert" className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}
    </Modal>;
}
