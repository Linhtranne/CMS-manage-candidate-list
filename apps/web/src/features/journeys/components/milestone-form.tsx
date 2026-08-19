'use client';

import { useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { useUpdateMilestone } from '../services/journey-queries';
import { milestoneSchema } from '../schemas/milestone.schema';
import { DepartureFields } from './departure-fields';

type Milestone = components['schemas']['JourneyMilestone'];
type Journey = components['schemas']['SupplyJourneyDetail'];
const statusLabels: Record<Exclude<Milestone['status'], 'WAIVED'>, string> = { NOT_STARTED: 'Chưa bắt đầu', IN_PROGRESS: 'Đang xử lý', COMPLETED: 'Hoàn tất', BLOCKED: 'Đang bị chặn', NOT_APPLICABLE: 'Không áp dụng' };

export function MilestoneForm({ journey, milestone, onCancel, onSaved }: { journey: Journey; milestone: Milestone; onCancel: () => void; onSaved?: () => void }) {
  const mutation = useUpdateMilestone(journey.id);
  const [status, setStatus] = useState<Exclude<Milestone['status'], 'WAIVED'>>(milestone.status === 'WAIVED' ? 'COMPLETED' : milestone.status);
  const [blockerParty, setBlockerParty] = useState<Milestone['blockerParty']>(milestone.blockerParty ?? null);
  const [blockerReason, setBlockerReason] = useState(milestone.blockerReason ?? '');
  const [naReason, setNaReason] = useState(milestone.naReason ?? '');
  const [evidenceIds, setEvidenceIds] = useState(milestone.evidenceIds);
  const [departureDate, setDepartureDate] = useState(journey.departurePlan?.departureDate ? journey.departurePlan.departureDate.slice(0, 16) : '');
  const [airport, setAirport] = useState(journey.departurePlan?.airport ?? '');
  const [departureNote, setDepartureNote] = useState(journey.departurePlan?.note ?? '');
  const [error, setError] = useState('');
  const submit = async () => {
    const parsed = milestoneSchema.safeParse({ status, blockerParty: blockerParty ?? null, blockerReason: blockerReason || null, naReason: naReason || null, evidenceIds, version: milestone.version });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Vui lòng kiểm tra thông tin'); return; }
    if (status === 'COMPLETED' && milestone.requiredEvidenceCount > evidenceIds.length) { setError('Mốc chưa đủ bằng chứng bắt buộc.'); return; }
    if (status === 'BLOCKED' && (!blockerParty || !blockerReason.trim())) { setError('Cần chọn bên đang chặn và nhập lý do.'); return; }
    if (status === 'NOT_APPLICABLE' && !naReason.trim()) { setError('Vui lòng nhập lý do không áp dụng.'); return; }
    try { await mutation.mutateAsync({ milestoneId: milestone.id, body: parsed.data }); onSaved?.(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể cập nhật mốc'); }
  };
  return <form className="space-y-4 rounded-lg border border-border bg-surface p-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}><div><h3 className="font-bold text-text">Cập nhật mốc: {milestone.name}</h3><p className="mt-1 text-sm text-text-muted">Mốc {milestone.sequence} · phiên bản dữ liệu {milestone.version}</p></div><label className="block text-sm font-semibold text-text">Trạng thái<select aria-label="Trạng thái mốc" name="trang-thai-moc" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal">{(Object.keys(statusLabels) as Array<Exclude<Milestone['status'], 'WAIVED'>>).map((key) => <option key={key} value={key}>{statusLabels[key]}</option>)}</select></label>{status === 'BLOCKED' ? <div className="space-y-3"><label className="block text-sm font-semibold text-text">Bên đang chặn<select aria-label="Bên đang chặn" name="ben-dang-chan" value={blockerParty ?? ''} onChange={(event) => setBlockerParty((event.target.value || null) as Milestone['blockerParty'])} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">Chọn bên</option><option value="CANDIDATE">Ứng viên</option><option value="CLIENT_PARTNER">Đối tác / khách hàng</option><option value="INTERNAL">Nội bộ</option><option value="OTHER">Khác</option></select></label><label className="block text-sm font-semibold text-text">Lý do bị chặn<textarea aria-label="Lý do bị chặn" name="ly-do-bi-chan" value={blockerReason} onChange={(event) => setBlockerReason(event.target.value)} className="mt-1 min-h-20 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label></div> : null}{status === 'NOT_APPLICABLE' ? <label className="block text-sm font-semibold text-text">Lý do không áp dụng<textarea aria-label="Lý do không áp dụng" name="ly-do-khong-ap-dung" value={naReason} onChange={(event) => setNaReason(event.target.value)} className="mt-1 min-h-20 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label> : null}<label className="block text-sm font-semibold text-text">Bằng chứng đã gắn<input aria-label="Mã bằng chứng" name="ma-bang-chung" value={evidenceIds.join(', ')} onChange={(event) => setEvidenceIds(event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} placeholder="evidence-id-1, evidence-id-2" className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /><span className="mt-1 block text-xs font-normal text-text-muted">Bắt buộc: {milestone.requiredEvidenceCount} tệp</span></label>{milestone.code === 'DEPARTURE_PLAN' && journey.hasDeparturePlan ? <DepartureFields departureDate={departureDate} airport={airport} note={departureNote} onChange={(patch) => { if (patch.departureDate !== undefined) setDepartureDate(patch.departureDate); if (patch.airport !== undefined) setAirport(patch.airport); if (patch.note !== undefined) setDepartureNote(patch.note); }} /> : null}{error ? <p role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button><Button type="submit" variant="primary" disabled={mutation.isPending}>Lưu mốc</Button></div></form>;
}
