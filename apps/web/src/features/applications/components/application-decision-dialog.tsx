'use client';

import { useEffect, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useDecideApplication } from '../services/application-queries';

type Application = components['schemas']['ApplicationDetail'];
type Decision = components['schemas']['ApplicationDecisionRequest']['status'];

export function ApplicationDecisionDialog({ application, open, onClose, onSaved }: { application: Application; open: boolean; onClose: () => void; onSaved?: (application: components['schemas']['Application']) => void }) {
  const [reasonCode, setReasonCode] = useState(application.decisionReason ?? '');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const decide = useDecideApplication();

  useEffect(() => {
    if (open) return;
    setReasonCode(application.decisionReason ?? ''); setNote(''); setError('');
  }, [application.decisionReason, open]);

  const submit = async (status: Decision) => {
    const completed = application.interviews.filter((item) => item.scheduleStatus === 'COMPLETED' && item.result !== 'PENDING');
    if (status === 'PASSED' && !completed.length) { setError('Cần nhập kết quả phỏng vấn trước khi xác nhận trúng tuyển.'); return; }
    if (status === 'PASSED' && !completed.some((item) => item.result === 'PASS')) { setError('Kết quả phỏng vấn chưa đạt để xác nhận trúng tuyển.'); return; }
    if ((status === 'FAILED' || status === 'WITHDRAWN') && !reasonCode.trim()) { setError('Cần nhập lý do kết thúc đơn.'); return; }
    try { const saved = await decide.mutateAsync({ applicationId: application.id, body: { status, reasonCode: reasonCode || null, note: note || null, decidedAt: new Date().toISOString(), version: application.version } }); onSaved?.(saved); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu quyết định'); }
  };

  return <Modal open={open} onClose={onClose} confirmOnClose={Boolean(reasonCode.trim() || note.trim())} title="Quyết định đơn ứng tuyển" description={`${application.candidate.code} · ${application.candidate.name} · ${application.order.code}`} size="md" footer={<><Button variant="secondary" onClick={() => void submit('WITHDRAWN')}>Xác nhận ứng viên rút</Button><Button variant="danger" onClick={() => void submit('FAILED')}>Xác nhận không đạt</Button><Button variant="primary" onClick={() => void submit('PASSED')}>Xác nhận trúng tuyển</Button></>}>
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-text">Lý do kết thúc (bắt buộc khi không đạt hoặc rút)<input aria-label="Lý do kết thúc" name="ly-do-ket-thuc" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label>
      <label className="block text-sm font-semibold text-text">Ghi chú<textarea aria-label="Ghi chú quyết định" name="ghi-chu-quyet-dinh" value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-20 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label>
      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
    </div>
  </Modal>;
}
