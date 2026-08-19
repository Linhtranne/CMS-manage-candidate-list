'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { Modal } from '@/components/ui/modal';
import { StatusLabel } from '@/components/ui/status-label';
import { useAddCandidatesToOrder, useClientsForOrder } from '../services/order-queries';
import { addCandidatesSchema } from '../schemas/add-candidates.schema';
import { CreateCandidateModal } from '@/features/candidates/components/create-candidate-modal';

export function AddCandidatesDialog({ orderId, open, onClose, initialCandidateId }: { orderId: string; open: boolean; onClose: () => void; initialCandidateId?: string }) {
  const [query, setQuery] = useState('');
  const [industry, setIndustry] = useState('');
  const [occupation, setOccupation] = useState('');
  const [skill, setSkill] = useState('');
  const [japaneseLevel, setJapaneseLevel] = useState('');
  const [readiness, setReadiness] = useState('');
  const [hasActiveJourney, setHasActiveJourney] = useState('');
  const [createCandidateOpen, setCreateCandidateOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(initialCandidateId ? [initialCandidateId] : []);
  const [error, setError] = useState('');
  const matches = useClientsForOrder({ orderId, query, industry: industry || undefined, occupation: occupation || undefined, skill: skill || undefined, japaneseLevel: japaneseLevel || undefined, readiness: readiness || undefined, hasActiveJourney: hasActiveJourney || undefined });
  const mutation = useAddCandidatesToOrder();
  const closeDialog = () => { setCreateCandidateOpen(false); onClose(); };

  useEffect(() => {
    if (!open) return;
    setQuery(''); setIndustry(''); setOccupation(''); setSkill(''); setJapaneseLevel(''); setReadiness(''); setHasActiveJourney(''); setCreateCandidateOpen(false); setSelected(initialCandidateId ? [initialCandidateId] : []); setError('');
  }, [initialCandidateId, open]);

  const toggleCandidate = (candidateId: string) => {
    setSelected((current) => current.includes(candidateId) ? current.filter((id) => id !== candidateId) : [...current, candidateId]);
  };

  const submit = () => {
    const parsed = addCandidatesSchema.safeParse({ candidateIds: selected, source: 'MANUAL_MATCH' });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Chọn ứng viên'); return; }
    setError('');
    mutation.mutate({ orderId, body: parsed.data }, { onSuccess: closeDialog, onError: (cause) => setError(cause.message) });
  };

  return <Modal open={open} onClose={closeDialog} confirmOnClose={Boolean(query || industry || occupation || skill || japaneseLevel || readiness || hasActiveJourney || selected.some((candidateId) => candidateId !== initialCandidateId))} title="Thêm ứng viên vào đơn" description="Lọc minh bạch theo hồ sơ hiện có; không tự động xếp hạng bằng AI." size="lg" footer={<><Button variant="secondary" onClick={closeDialog}>Hủy</Button><Button variant="primary" onClick={submit} disabled={mutation.isPending}>Thêm vào đơn</Button></>}>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="block text-sm font-semibold lg:col-span-2">Tìm ứng viên<input aria-label="Tìm ứng viên" name="tim-ung-vien" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã, tên, nghề…" className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><label className="block text-sm font-semibold">Ngành<select aria-label="Ngành ứng viên trong đơn" name="nganh-ung-vien-trong-don" value={industry} onChange={(event) => setIndustry(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">Tất cả ngành</option><option value="Công nghệ thông tin">Công nghệ thông tin</option><option value="Điều dưỡng">Điều dưỡng</option><option value="Cơ khí chế tạo">Cơ khí chế tạo</option></select></label><label className="block text-sm font-semibold">Tiếng Nhật<select aria-label="Tiếng Nhật ứng viên trong đơn" name="tieng-nhat-ung-vien-trong-don" value={japaneseLevel} onChange={(event) => setJapaneseLevel(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">Tất cả</option><option>N2</option><option>N3</option><option>N4</option></select></label><label className="block text-sm font-semibold">Nghề<input aria-label="Nghề ứng viên trong đơn" name="nghe-ung-vien-trong-don" value={occupation} onChange={(event) => setOccupation(event.target.value)} placeholder="Ví dụ: QA…" className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><label className="block text-sm font-semibold">Kỹ năng<input aria-label="Kỹ năng ứng viên trong đơn" name="ky-nang-ung-vien-trong-don" value={skill} onChange={(event) => setSkill(event.target.value)} placeholder="Ví dụ: React…" className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><label className="block text-sm font-semibold">Sẵn sàng<select aria-label="Mức sẵn sàng ứng viên trong đơn" name="muc-san-sang-ung-vien-trong-don" value={readiness} onChange={(event) => setReadiness(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">Tất cả</option><option value="sẵn sàng">Sẵn sàng phỏng vấn</option><option value="đủ hồ sơ">Đủ hồ sơ</option></select></label><label className="block text-sm font-semibold">Lộ trình<select aria-label="Lộ trình hiện tại của ứng viên" name="lo-trinh-hien-tai-cua-ung-vien" value={hasActiveJourney} onChange={(event) => setHasActiveJourney(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">Tất cả</option><option value="false">Chưa có lộ trình</option><option value="true">Đang có lộ trình</option></select></label></div>
      {matches.isPending ? <div className="mt-4"><LoadingState /></div> : <div className="mt-4 overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[660px] text-left text-sm"><thead className="border-b border-border bg-surface text-xs uppercase tracking-wide text-text-muted"><tr><th className="px-3 py-3">Chọn</th><th className="px-3 py-3">Ứng viên</th><th className="px-3 py-3">Ngành / nghề</th><th className="px-3 py-3">Tiếng Nhật</th><th className="px-3 py-3">Sẵn sàng</th><th className="px-3 py-3">Lưu ý</th></tr></thead><tbody>{(matches.data?.items ?? []).map((candidate) => {
        const disabled = candidate.hasActiveApplicationInOrder;
        const isSelected = selected.includes(candidate.id);
        const selectFromRow = () => { if (!disabled) toggleCandidate(candidate.id); };
        return <tr key={candidate.id} aria-selected={isSelected} tabIndex={disabled ? undefined : 0} onClick={selectFromRow} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) { event.preventDefault(); selectFromRow(); } }} className={`border-b border-border last:border-0 ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-surface'}`}><td className="px-3 py-3"><input type="checkbox" aria-label={`Chọn ${candidate.name}`} name={`candidate-selection-${candidate.id}`} checked={isSelected} disabled={disabled} onClick={(event) => event.stopPropagation()} onChange={() => toggleCandidate(candidate.id)} /></td><td className="px-3 py-3 font-semibold">{candidate.code} · {candidate.name}</td><td className="px-3 py-3">{candidate.industryLabel}<br /><span className="text-xs text-text-muted">{candidate.occupation}</span></td><td className="px-3 py-3">{candidate.japaneseLevel}</td><td className="px-3 py-3">{candidate.readiness}</td><td className="px-3 py-3">{disabled ? <StatusLabel tone="neutral">Đã trong đơn</StatusLabel> : candidate.hasActiveJourney ? <StatusLabel tone="warning">Đang có lộ trình cung ứng</StatusLabel> : <StatusLabel tone="success">Có thể chọn</StatusLabel>}</td></tr>;
      })}</tbody></table></div>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-text-muted">Không tìm thấy hồ sơ phù hợp?</p><Button variant="secondary" size="sm" onClick={() => setCreateCandidateOpen(true)}>Tạo ứng viên mới</Button></div>{error ? <p role="alert" className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}
      <CreateCandidateModal open={createCandidateOpen} onClose={() => setCreateCandidateOpen(false)} onCreated={(candidate) => { setSelected((current) => current.includes(candidate.id) ? current : [...current, candidate.id]); setCreateCandidateOpen(false); }} />
    </Modal>;
}
