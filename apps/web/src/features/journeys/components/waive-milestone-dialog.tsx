'use client';

import { useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useWaiveMilestone } from '../services/journey-queries';
import { waiverSchema } from '../schemas/milestone.schema';

type Milestone = components['schemas']['JourneyMilestone'];
export function WaiveMilestoneDialog({ journeyId, milestone, open, onClose, onSaved }: { journeyId: string; milestone: Milestone; open: boolean; onClose: () => void; onSaved?: () => void }) {
  const mutation = useWaiveMilestone(journeyId);
  const [reason, setReason] = useState('');
  const [approverId, setApproverId] = useState('u-manager');
  const [error, setError] = useState('');
  const submit = async () => {
    const parsed = waiverSchema.safeParse({ reason, approverId, evidenceIds: milestone.evidenceIds, version: milestone.version });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Vui lòng kiểm tra thông tin'); return; }
    try { await mutation.mutateAsync({ milestoneId: milestone.id, body: parsed.data }); onSaved?.(); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể miễn trừ mốc'); }
  };
  return <Modal open={open} onClose={onClose} title="Xác nhận miễn trừ" description={milestone.name} size="md" footer={<><Button onClick={onClose}>Hủy</Button><Button variant="primary" onClick={() => void submit()} disabled={mutation.isPending}>{mutation.isPending ? 'Đang lưu…' : 'Xác nhận miễn trừ'}</Button></>}>
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-text">Lý do miễn trừ<textarea aria-label="Lý do miễn trừ" name="ly-do-mien-tru" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-24 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label>
      <label className="block text-sm font-semibold text-text">Người duyệt<select aria-label="Người duyệt" name="nguoi-duyet" value={approverId} onChange={(event) => setApproverId(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="u-manager">Lê Thu Hà</option><option value="u-coordinator">Trần Quốc Huy</option></select></label>
      {error ? <p role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}
    </div>
  </Modal>;
}
